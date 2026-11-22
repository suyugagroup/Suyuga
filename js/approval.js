// js/approval.js
import { supabase } from './supabase-client.js';

// ============================================================
// LIST SO yang perlu approval
// ============================================================
export async function listPendingApprovals() {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      partners!inner(code, name),
      profiles!sales_id(email, full_name)
    `)
    .in('status', ['pending_approval','approved'])
    .order('id', { ascending: false });
  if (error) throw error;
  return data;
}

// ============================================================
// APPROVE — return string status ('approved' / 'pending_approval')
// ============================================================
export async function approveSO(soId) {
  const { data, error } = await supabase.rpc('approve_so', { p_so_id: soId });
  if (error) throw error;
  return data?.status || 'approved';    // ← return string, bukan object
}

// ============================================================
// REJECT
// ============================================================
export async function rejectSO(soId, reason) {
  const { data, error } = await supabase.rpc('reject_so', { p_so_id: soId, p_reason: reason });
  if (error) throw error;
  return data;
}

// ============================================================
// VOID
// ============================================================
export async function voidSO(soId, reason) {
  const { data, error } = await supabase.rpc('void_so', { p_so_id: soId, p_reason: reason });
  if (error) throw error;
  return data;
}

// ============================================================
// GET SO LINES — untuk detail panel
// ============================================================
export async function getSOLines(soId) {
  const { data, error } = await supabase
    .from('sales_order_lines')
    .select(`
      id, item_id, qty, unit_price, memo,
      price_list_price, price_list_discount_pct, price_list_effective_price,
      so_discount_pct, so_effective_price,
      price_diff, price_diff_pct,
      price_override_status, price_override_reason,
      price_override_approved_by, price_override_approved_at,
      items!inner(sku, name, unit)
    `)
    .eq('so_id', soId)
    .order('id');
  if (error) throw error;
  return data || [];
}