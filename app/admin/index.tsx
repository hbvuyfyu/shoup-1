import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Users,
  ShoppingBag,
  DollarSign,
  Wallet,
  Store,
  Megaphone,
  UserCircle,
  Package,
  TrendingUp,
  ArrowRight,
  Shield,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

type Stats = {
  totalUsers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: string;
  pendingWithdrawals: string;
  merchants: number;
  publishers: number;
  customers: number;
};

const ADMIN_API_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-api`;

export default function AdminDashboardScreen() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }
      const response = await fetch(`${ADMIN_API_BASE}/stats`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${response.status})`);
      }
      const data = await response.json();
      setStats(data.stats as Stats);
    } catch (e: any) {
      setError(e.message || 'Failed to load stats');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ── Access guard ──────────────────────────────────────────────
  if (!user || !isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Admin</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.accessGuard}>
          <Shield size={64} color={colors.neutral[300]} />
          <Text style={styles.accessTitle}>Admin Access Required</Text>
          <Text style={styles.accessMsg}>
            You need administrator privileges to view this dashboard.
          </Text>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button
              title="Back to Home"
              onPress={() => router.replace('/(tabs)/index')}
              fullWidth
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Admin Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Admin Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <View style={{ marginTop: spacing.lg }}>
            <Button title="Retry" onPress={load} variant="outline" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Stat cards ────────────────────────────────────────────────
  const statCards: {
    label: string;
    value: string;
    icon: React.ReactNode;
    bg: string;
    iconBg: string;
  }[] = [
    {
      label: 'Total Users',
      value: stats ? String(stats.totalUsers) : '—',
      icon: <Users size={22} color={colors.primary[700]} />,
      bg: colors.primary[50],
      iconBg: colors.primary[100],
    },
    {
      label: 'Total Orders',
      value: stats ? String(stats.totalOrders) : '—',
      icon: <ShoppingBag size={22} color={colors.success[700]} />,
      bg: colors.success[50],
      iconBg: colors.success[100],
    },
    {
      label: 'Total Revenue',
      value: stats ? `$${Number(stats.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
      icon: <DollarSign size={22} color={colors.accent[600]} />,
      bg: colors.accent[50],
      iconBg: colors.accent[100],
    },
    {
      label: 'Pending Withdrawals',
      value: stats ? `$${Number(stats.pendingWithdrawals).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
      icon: <Wallet size={22} color={colors.warning[600]} />,
      bg: colors.warning[50],
      iconBg: colors.warning[100],
    },
    {
      label: 'Merchants',
      value: stats ? String(stats.merchants) : '—',
      icon: <Store size={22} color={colors.primary[700]} />,
      bg: colors.primary[50],
      iconBg: colors.primary[100],
    },
    {
      label: 'Publishers',
      value: stats ? String(stats.publishers) : '—',
      icon: <Megaphone size={22} color={colors.accent[600]} />,
      bg: colors.accent[50],
      iconBg: colors.accent[100],
    },
    {
      label: 'Customers',
      value: stats ? String(stats.customers) : '—',
      icon: <UserCircle size={22} color={colors.neutral[700]} />,
      bg: colors.neutral[100],
      iconBg: colors.neutral[200],
    },
    {
      label: 'Total Products',
      value: stats ? String(stats.totalProducts) : '—',
      icon: <Package size={22} color={colors.success[700]} />,
      bg: colors.success[50],
      iconBg: colors.success[100],
    },
  ];

  const quickLinks = [
    {
      label: 'Manage Users',
      description: 'Roles, bans, activation & merchant restrictions',
      icon: <Users size={24} color={colors.primary[600]} />,
      onPress: () => router.push('/admin/users'),
    },
    {
      label: 'Manage Withdrawals',
      description: 'Approve, reject & pay withdrawal requests',
      icon: <Wallet size={24} color={colors.primary[600]} />,
      onPress: () => router.push('/admin/withdrawals'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome banner */}
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeGreeting}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{profile?.full_name || 'Admin'}</Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Shield size={28} color={colors.primary[600]} />
          </View>
        </View>

        {/* Error banner (non-blocking when stats exist) */}
        {error && stats ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {statCards.map((card, idx) => (
            <View key={idx} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: card.iconBg }]}>
                {card.icon}
              </View>
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick links */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Quick Actions</Text>
        {quickLinks.map((link, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.quickLinkCard}
            onPress={link.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.quickLinkIcon}>{link.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickLinkLabel}>{link.label}</Text>
              <Text style={styles.quickLinkDesc}>{link.description}</Text>
            </View>
            <ArrowRight size={20} color={colors.neutral[400]} />
          </TouchableOpacity>
        ))}

        {/* Sign out */}
        <View style={{ marginTop: spacing.xl }}>
          <Button
            title="Sign Out"
            onPress={() => {
              signOut();
              router.replace('/(tabs)/index');
            }}
            variant="outline"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Access guard
  accessGuard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  accessTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  accessMsg: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text,
  },
  errorMsg: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: colors.error[50],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error[100],
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error[700],
  },
  // Welcome banner
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary[600],
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  welcomeLeft: {
    flex: 1,
  },
  welcomeGreeting: {
    ...typography.bodySmall,
    color: colors.primary[100],
  },
  welcomeName: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Quick links
  quickLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  quickLinkDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
