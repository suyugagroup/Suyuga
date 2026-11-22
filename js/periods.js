// js/periods.js
import { supabase } from './supabase-client.js';

// ============================================================
// Daftar periode terkunci
// ============================================================
export async function listLockedPeriods() {
  const { data, error } = await supabase
    .from('periods')
    .select(`
      id, period_year, period_month, is_locked, locked_at, notes,
      profiles!locked_by(email, full_name)
    `)
    .eq('is_locked', true)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    year: p.period_year,
    month: p.period_month
  }));
}

// ============================================================
// Kunci periode
// ============================================================
export async function lockPeriod(year, month, notes = null) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('periods')
    .upsert({
      period_year: year,
      period_month: month,
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: session?.user?.id ?? null,
      notes
    }, { onConflict: 'period_year,period_month' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// Buka kunci periode
// ============================================================
export async function unlockPeriod(id) {
  const { error } = await supabase
    .from('periods')
    .update({ is_locked: false, locked_at: null, locked_by: null })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// Cek apakah periode tertentu terkunci
// ============================================================
export async function checkPeriodLocked(year, month) {
  const { data, error } = await supabase
    .from('periods')
    .select('id, is_locked')
    .eq('period_year', year)
    .eq('period_month', month)
    .maybeSingle();
  if (error) throw error;
  return data?.is_locked === true;
}

// ============================================================
// Cek apakah tanggal (YYYY-MM-DD) terkunci
// ============================================================
export async function isDateLocked(dateStr) {
  const d = new Date(dateStr);
  return checkPeriodLocked(d.getFullYear(), d.getMonth() + 1);
}