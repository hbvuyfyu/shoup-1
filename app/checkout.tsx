import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, MapPin, Truck, CreditCard, CheckCircle, Plus } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import type { Address } from '@/lib/supabase';

type ShippingMethod = 'standard' | 'express' | 'pickup';
type PaymentMethod = 'card' | 'cash_on_delivery' | 'transfer';

export default function CheckoutScreen() {
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });
    const list = (data as Address[]) ?? [];
    setAddresses(list);
    setSelectedAddress(list.find(a => a.is_default) ?? list[0] ?? null);
  }, [user]);

  useEffect(() => {
    loadAddresses().finally(() => setLoading(false));
  }, [loadAddresses]);

  const shippingCost = shippingMethod === 'express' ? 14.99 : shippingMethod === 'standard' ? (subtotal >= 50 ? 0 : 5.99) : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  const placeOrder = useCallback(async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to place an order.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Address required', 'Please add or select a shipping address.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty cart', 'Add items to your cart first.');
      return;
    }
    setPlacing(true);
    try {
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
      const shippingAddress = {
        full_name: selectedAddress.full_name,
        phone: selectedAddress.phone,
        country: selectedAddress.country,
        city: selectedAddress.city,
        street: selectedAddress.street,
        postal_code: selectedAddress.postal_code,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: 'pending',
          subtotal,
          shipping_cost: shippingCost,
          tax,
          total,
          shipping_address: shippingAddress,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cash_on_delivery' ? 'unpaid' : 'unpaid',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product?.name ?? 'Product',
        product_image: item.product?.images?.[0]?.image_url ?? null,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.product?.price ?? 0,
        subtotal: (item.product?.price ?? 0) * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Process merchant and affiliate earnings (75% to merchant, 10% to affiliate, 10-day hold)
      await supabase.rpc('process_order_merchant_earnings', { p_order_id: order.id });

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'order_placed',
        title: 'Order Confirmed',
        body: `Your order ${orderNumber} has been placed successfully.`,
        data: { order_id: order.id },
      });

      await clearCart();
      Alert.alert(
        'Order Placed!',
        `Your order ${orderNumber} has been placed successfully.`,
        [{ text: 'View Orders', onPress: () => router.replace('/orders') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }, [user, selectedAddress, items, subtotal, shippingCost, tax, total, paymentMethod, clearCart]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary[600]} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
        <EmptyState title="Your cart is empty" message="Add items before checking out" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Section title="Shipping Address" icon={<MapPin size={18} color={colors.primary[600]} />}>
          {selectedAddress ? (
            <View style={styles.addressCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressName}>{selectedAddress.full_name}</Text>
                <Text style={styles.addressText}>{selectedAddress.street}</Text>
                <Text style={styles.addressText}>
                  {selectedAddress.city}, {selectedAddress.country}
                </Text>
                {selectedAddress.postal_code ? (
                  <Text style={styles.addressText}>{selectedAddress.postal_code}</Text>
                ) : null}
                <Text style={styles.addressText}>{selectedAddress.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/addresses')}>
                <Text style={styles.changeBtn}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => router.push('/addresses')}
            >
              <Plus size={20} color={colors.primary[600]} />
              <Text style={styles.addAddressText}>Add Address</Text>
            </TouchableOpacity>
          )}
        </Section>
        <Section title="Shipping Method" icon={<Truck size={18} color={colors.primary[600]} />}>
          {([
            { key: 'standard', label: 'Standard', desc: '5-7 business days', price: subtotal >= 50 ? 'FREE' : '$5.99' },
            { key: 'express', label: 'Express', desc: '2-3 business days', price: '$14.99' },
            { key: 'pickup', label: 'Store Pickup', desc: 'Ready in 24 hours', price: 'FREE' },
          ] as { key: ShippingMethod; label: string; desc: string; price: string }[]).map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.optionRow, shippingMethod === m.key && styles.optionRowActive]}
              onPress={() => setShippingMethod(m.key)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{m.label}</Text>
                <Text style={styles.optionDesc}>{m.desc}</Text>
              </View>
              <Text style={styles.optionPrice}>{m.price}</Text>
              <View style={[styles.radio, shippingMethod === m.key && styles.radioActive]}>
                {shippingMethod === m.key ? <View style={styles.radioDot} /> : null}
              </View>
            </TouchableOpacity>
          ))}
        </Section>
        <Section title="Payment Method" icon={<CreditCard size={18} color={colors.primary[600]} />}>
          {([
            { key: 'cash_on_delivery', label: 'Cash on Delivery', desc: 'Pay when you receive' },
            { key: 'card', label: 'Credit/Debit Card', desc: 'Visa, Mastercard, Amex' },
            { key: 'transfer', label: 'Bank Transfer', desc: 'Direct bank transfer' },
          ] as { key: PaymentMethod; label: string; desc: string }[]).map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.optionRow, paymentMethod === m.key && styles.optionRowActive]}
              onPress={() => setPaymentMethod(m.key)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{m.label}</Text>
                <Text style={styles.optionDesc}>{m.desc}</Text>
              </View>
              <View style={[styles.radio, paymentMethod === m.key && styles.radioActive]}>
                {paymentMethod === m.key ? <View style={styles.radioDot} /> : null}
              </View>
            </TouchableOpacity>
          ))}
        </Section>
        <Section title="Order Summary">
          {items.map(item => (
            <View key={item.id} style={styles.summaryItem}>
              <Text style={styles.summaryItemName} numberOfLines={1}>
                {item.product?.name} x{item.quantity}
              </Text>
              <Text style={styles.summaryItemPrice}>
                ${((item.product?.price ?? 0) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>
              {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </Section>
      </ScrollView>
      <View style={styles.bottomBar}>
        <Button
          title={placing ? 'Placing Order...' : 'Place Order'}
          onPress={placeOrder}
          loading={placing}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
  section: {
    margin: spacing.md,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  sectionBody: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  addressCard: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addressName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  addressText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  changeBtn: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary[600],
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  addAddressText: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRowActive: {},
  optionLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  optionDesc: {
    ...typography.caption,
    color: colors.textMuted,
  },
  optionPrice: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.text,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary[600],
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[600],
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: spacing.md,
  },
  summaryItemName: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text,
  },
  summaryItemPrice: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    ...typography.h4,
    color: colors.text,
  },
  totalValue: {
    ...typography.h4,
    fontWeight: '700',
    color: colors.primary[600],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
});
