// js/kasir.js
import { supabase } from './supabase-client.js';

export async function createCashSale({ cash_date, description, lines, partner_id = null, customer_name = null, payment_method = 'cash', paid_amount = null }) {
  // Hitung paid_amount default = grand_total kalau cash & tidak diisi
  const payload = {
    cash_date,
    partner_id,
    customer_name,
    payment_method,
    paid_amount: paid_amount ?? 0,
    note: description,
    lines: lines.map(l => ({
      item_id: l.item_id,
      qty: l.qty,
      unit_price: l.unit_price,
      discount_pct: 0,
      display_name: null,
      memo: null
    }))
  };
  const { data, error } = await supabase.rpc('create_cash_sale', { p_payload: payload });
  if (error) throw error;
  return data; // { sale_id, sale_no, journal_id, subtotal, ppn_amount, grand_total, change_amount }
}

export async function listCashSales({ from = null, to = null, limit = 100 } = {}) {
  let q = supabase.from('cash_sales')
    .select('*, profiles!kasir_id(full_name, email)')
    .order('cash_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (from) q = q.gte('cash_date', from);
  if (to)   q = q.lte('cash_date', to);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getCashSale(saleId) {
  const { data: header, error: hErr } = await supabase
    .from('cash_sales').select('*').eq('id', saleId).single();
  if (hErr) throw hErr;

  const { data: lines, error: lErr } = await supabase
    .from('cash_sale_lines')
    .select('*, items!inner(sku, name, unit)')
    .eq('sale_id', saleId).order('id');
  if (lErr) throw lErr;

  return { ...header, lines };
}

export async function voidCashSale(saleId, reason) {
  const { data, error } = await supabase.rpc('void_cash_sale', { p_sale_id: saleId, p_reason: reason });
  if (error) throw error;
  return data;
}