// js/journals.js
import { supabase } from './supabase-client.js';

export async function listJournals({ limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('journals').select('*')
    .is('deleted_at', null)
    .order('journal_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getJournal(id) {
  const { data: header, error: hErr } = await supabase
    .from('journals').select('*').eq('id', id).single();
  if (hErr) throw hErr;
  const { data: lines, error: lErr } = await supabase
    .from('journal_lines').select('*').eq('journal_id', id).order('line_no');
  if (lErr) throw lErr;
  return { ...header, lines };
}

export async function createJournal({ journal_date, description, ref_no, lines }) {
  const { data: { session } } = await supabase.auth.getSession();
  // Generate journal_no
  const { count } = await supabase.from('journals').select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(4, '0');
  const journal_no = 'JV-' + new Date(journal_date).toISOString().slice(0,10).replace(/-/g,'') + '-' + seq;

  const { data: header, error: hErr } = await supabase
    .from('journals').insert({
      journal_no, journal_date, description, ref_no,
      currency_code: 'IDR', exchange_rate: 1,
      created_by: session?.user?.id
    }).select().single();
  if (hErr) throw hErr;

  const rows = lines.map((l, i) => ({
    journal_id: header.id, line_no: i + 1,
    account_id: l.account_id, partner_id: l.partner_id || null,
    debit: l.debit || 0, credit: l.credit || 0,
    debit_base: l.debit || 0, credit_base: l.credit || 0,
    memo: l.memo || null
  }));
  const { error: lErr } = await supabase.from('journal_lines').insert(rows);
  if (lErr) throw lErr;
  return header;
}

export async function deleteJournal(id) {
  const { error } = await supabase.from('journals')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function getRate() { return 1; }