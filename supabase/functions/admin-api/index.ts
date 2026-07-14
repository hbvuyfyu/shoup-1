import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing auth header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_banned")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/admin-api", "");
    const method = req.method;

    // GET /users - list all users with profiles + email from auth.users
    if (path === "/users" && method === "GET") {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);

      // Fetch emails from auth.users (admin API has service-role access)
      const userIds = (profiles || []).map((p: any) => p.id);
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: authUsers } = await supabase.auth.admin.listUsers({
          perPage: 1000,
        });
        for (const u of authUsers?.users ?? []) {
          emailMap[u.id] = u.email ?? "";
        }
      }

      const users = (profiles || []).map((p: any) => ({
        ...p,
        email: emailMap[p.id] ?? "",
      }));
      return jsonResponse({ users });
    }

    // PUT /users/:id/role - update user role
    if (path.match(/^\/users\/[^/]+\/role$/) && method === "PUT") {
      const userId = path.split("/")[2];
      const { role } = await req.json();
      const validRoles = ["customer", "publisher", "merchant", "admin"];
      if (!validRoles.includes(role)) {
        return jsonResponse({ error: "Invalid role" }, 400);
      }
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (error) return jsonResponse({ error: error.message }, 500);

      if (role === "merchant" || role === "publisher") {
        await supabase.from("wallets").upsert({ user_id: userId }).eq("user_id", userId);
      }
      return jsonResponse({ success: true });
    }

    // PUT /users/:id/ban - ban/unban user
    if (path.match(/^\/users\/[^/]+\/ban$/) && method === "PUT") {
      const userId = path.split("/")[2];
      const { is_banned } = await req.json();
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned })
        .eq("id", userId);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ success: true });
    }

    // PUT /users/:id/active - activate/deactivate user
    if (path.match(/^\/users\/[^/]+\/active$/) && method === "PUT") {
      const userId = path.split("/")[2];
      const { is_active } = await req.json();
      const { error } = await supabase
        .from("profiles")
        .update({ is_active })
        .eq("id", userId);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ success: true });
    }

    // GET /withdrawals - list all withdrawal requests
    if (path === "/withdrawals" && method === "GET") {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*, profile:profiles!user_id(id, full_name, email)")
        .order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ withdrawals: data });
    }

    // PUT /withdrawals/:id - process withdrawal (approve/reject/pay)
    if (path.match(/^\/withdrawals\/[^/]+$/) && method === "PUT") {
      const withdrawalId = path.split("/")[2];
      const { status, admin_notes } = await req.json();

      if (status === "paid") {
        const { error } = await supabase.rpc("process_withdrawal", {
          p_withdrawal_id: withdrawalId,
          p_status: "paid",
        });
        if (error) return jsonResponse({ error: error.message }, 500);
      } else {
        const { error } = await supabase
          .from("withdrawal_requests")
          .update({ status, admin_notes: admin_notes || null, processed_at: new Date().toISOString() })
          .eq("id", withdrawalId);
        if (error) return jsonResponse({ error: error.message }, 500);
      }
      return jsonResponse({ success: true });
    }

    // GET /restrictions/:merchantId - fetch merchant restrictions
    if (path.match(/^\/restrictions\/[^/]+$/) && method === "GET") {
      const merchantId = path.split("/")[2];
      const { data, error } = await supabase
        .from("merchant_restrictions")
        .select("*")
        .eq("merchant_id", merchantId)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ restrictions: data });
    }

    // PUT /restrictions/:merchantId - update merchant restrictions
    if (path.match(/^\/restrictions\/[^/]+$/) && method === "PUT") {
      const merchantId = path.split("/")[2];
      const body = await req.json();
      const { error } = await supabase
        .from("merchant_restrictions")
        .upsert({
          merchant_id: merchantId,
          can_upload_products: body.can_upload_products ?? true,
          can_upload_reels: body.can_upload_reels ?? true,
          can_edit_products: body.can_edit_products ?? true,
          can_delete_products: body.can_delete_products ?? true,
          restricted_notes: body.restricted_notes || null,
        })
        .eq("merchant_id", merchantId);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ success: true });
    }

    // GET /stats - admin dashboard stats
    if (path === "/stats" && method === "GET") {
      const [usersResult, ordersResult, withdrawalsResult, productsResult] = await Promise.all([
        supabase.from("profiles").select("id, role", { count: "exact" }),
        supabase.from("orders").select("id, total, status", { count: "exact" }),
        supabase.from("withdrawal_requests").select("id, amount, status", { count: "exact" }),
        supabase.from("products").select("id", { count: "exact" }),
      ]);

      const totalRevenue = (ordersResult.data || [])
        .filter((o: any) => o.status !== "cancelled")
        .reduce((sum: number, o: any) => sum + parseFloat(o.total || "0"), 0);

      const pendingWithdrawals = (withdrawalsResult.data || [])
        .filter((w: any) => w.status === "pending")
        .reduce((sum: number, w: any) => sum + parseFloat(w.amount || "0"), 0);

      const stats = {
        totalUsers: usersResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalRevenue: totalRevenue.toFixed(2),
        pendingWithdrawals: pendingWithdrawals.toFixed(2),
        merchants: (usersResult.data || []).filter((u: any) => u.role === "merchant").length,
        publishers: (usersResult.data || []).filter((u: any) => u.role === "publisher").length,
        customers: (usersResult.data || []).filter((u: any) => u.role === "customer").length,
      };
      return jsonResponse({ stats });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    return jsonResponse({ error: (err as Error)?.message || "Internal server error" }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
