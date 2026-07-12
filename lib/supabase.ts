import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  brand: string | null;
  sku: string | null;
  material: string | null;
  status: string;
  is_featured: boolean;
  is_new: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  color_hex: string | null;
  stock: number;
  sku: string | null;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  product?: Product;
};

export type Order = {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  shipping_address: any;
  payment_method: string;
  payment_status: string;
  tracking_number: string | null;
  carrier: string | null;
  notes: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type Address = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  postal_code: string | null;
  is_default: boolean;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  is_approved: boolean;
  helpful_count: number;
  created_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_spend: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_text: string | null;
  cta_link: string | null;
  placement: string;
  sort_order: number;
  is_active: boolean;
};

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: any;
  is_read: boolean;
  created_at: string;
};

export type ReturnRequest = {
  id: string;
  user_id: string;
  order_id: string;
  order_item_id: string;
  reason: string;
  description: string | null;
  images: string[];
  type: 'refund' | 'exchange';
  status: string;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  default_currency: string;
  default_language: string;
};

export type Reel = {
  id: string;
  product_id: string | null;
  video_url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  likes_count: number;
  comments_count: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  product?: Product;
};

export type ReelLike = {
  id: string;
  reel_id: string;
  user_id: string;
  created_at: string;
};

export type ReelComment = {
  id: string;
  reel_id: string;
  user_id: string;
  body: string;
  created_at: string;
};
