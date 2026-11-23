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

export async function createJournal({ journal_date, description, ref_no, lines, currency_code = 'IDR', exchange_rate = 1 }) {
  const { data: { session } } = await supabase.auth.getSession();
  const today = new Date(journal_date).toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'JV-' + today + '-';

  const { data: existing } = await supabase
    .from('journals')
    .select('journal_no')
    .like('journal_no', prefix + '%')
    .order('journal_no', { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (existing && existing.length) {
    const match = existing[0].journal_no.match(/-(\d+)(?:-REV)?$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }
  const journal_no = prefix + String(nextSeq).padStart(4, '0');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  const { data: header, error: hErr } = await supabase
    .from('journals').insert({
      journal_no,
      journal_date,
      description: description || 'Jurnal manual',
      ref_no: ref_no || null,
      currency_code: currency_code || 'IDR',
      exchange_rate: exchange_rate || 1,
      created_by: userId
    }).select().single();
  if (hErr) {
    console.error('[createJournal] insert header error:', hErr);
    throw hErr;
  }

  const rows = lines.map((l, i) => ({
    journal_id: header.id, line_no: i + 1,
    account_id: l.account_id, partner_id: l.partner_id || null,
    debit: l.debit || 0, credit: l.credit || 0,
    debit_base: l.debit || 0, credit_base: l.credit || 0,
    memo: l.memo || null
  }));
  const { error: lErr } = await supabase.from('journal_lines').insert(rows);
  if (lErr) {
    console.error('[createJournal] insert lines error:', lErr);
    throw lErr;
  }
  return header;
}

export async function updateJournal(id, { journal_date, description, ref_no, lines, currency_code = 'IDR', exchange_rate = 1 }) {
  // Ambil data lama untuk fallback
  const { data: old, error: gErr } = await supabase
    .from('journals').select('*').eq('id', id).single();
  if (gErr) throw gErr;

  const payload = {
    journal_date:  journal_date || old.journal_date,
    description:   description || old.description || 'Jurnal manual',
    ref_no:        ref_no !== undefined ? (ref_no || null) : old.ref_no,
    currency_code: currency_code || old.currency_code || 'IDR',
    exchange_rate: Number(exchange_rate) || Number(old.exchange_rate) || 1
  };

  console.log('[updateJournal] payload:', payload);

  const { error: hErr } = await supabase
    .from('journals').update(payload).eq('id', id);
  if (hErr) {
    console.error('[updateJournal] header error:', hErr, 'payload:', payload);
    throw hErr;
  }

  // Hapus lines lama, insert baru
  const { error: dErr } = await supabase.from('journal_lines').delete().eq('journal_id', id);
  if (dErr) throw dErr;

  const rows = lines.map((l, i) => ({
    journal_id: id, line_no: i + 1,
    account_id: l.account_id,
    partner_id: l.partner_id || null,
    debit:       Number(l.debit)  || 0,
    credit:      Number(l.credit) || 0,
    debit_base:  Number(l.debit)  || 0,
    credit_base: Number(l.credit) || 0,
    memo: l.memo || null
  }));
  const { error: lErr } = await supabase.from('journal_lines').insert(rows);
  if (lErr) {
    console.error('[updateJournal] lines error:', lErr, 'rows:', rows);
    throw lErr;
  }
}

export async function deleteJournal(id) {
  // 1) Ambil jurnal yang mau dihapus
  const { data: original, error: gErr } = await supabase
    .from('journals').select('journal_no').eq('id', id).single();
  if (gErr) throw gErr;

  const now = new Date().toISOString();

  // 2) Soft-delete jurnal asli
  const { error: dErr } = await supabase
    .from('journals').update({ deleted_at: now }).eq('id', id);
  if (dErr) throw dErr;

  // 3) Cari reversal via ref_no = journal_no + '-REV'
  const reversalRef = original.journal_no + '-REV';
  const { error: rErr } = await supabase
    .from('journals').update({ deleted_at: now })
    .eq('ref_no', reversalRef);
  if (rErr) {
    console.error('[deleteJournal] gagal hapus reversal:', rErr);
  }
}

export async function reverseJournal(id) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data: original, error: gErr } = await supabase
    .from('journals').select('*, journal_lines(*)').eq('id', id).single();
  if (gErr) throw gErr;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'JV-' + today + '-';

  const { data: existing } = await supabase
    .from('journals')
    .select('journal_no')
    .like('journal_no', prefix + '%')
    .order('journal_no', { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (existing && existing.length) {
    const match = existing[0].journal_no.match(/-(\d+)(?:-REV)?$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }

  const reversal_no = prefix + String(nextSeq).padStart(4, '0') + '-REV';

  const { data: header, error: hErr } = await supabase
    .from('journals').insert({
      journal_no: reversal_no,
      journal_date: new Date().toISOString().slice(0, 10),
      description: `Reversal ${original.journal_no}`,
      ref_no: original.journal_no + '-REV',
      ref_type: original.ref_type,
      currency_code: original.currency_code,
      exchange_rate: original.exchange_rate,
      partner_id: original.partner_id,
      created_by: session?.user?.id ?? null
    }).select().single();
  if (hErr) throw hErr;

  const rows = original.journal_lines.map((l, i) => ({
    journal_id: header.id, line_no: i + 1,
    account_id: l.account_id, partner_id: l.partner_id,
    debit: l.credit || 0, credit: l.debit || 0,
    debit_base: l.credit_base || 0, credit_base: l.debit_base || 0,
    memo: `Reversal: ${l.memo || ''}`
  }));
  const { error: lErr } = await supabase.from('journal_lines').insert(rows);
  if (lErr) throw lErr;

  return header;
}

export async function getRate() { return 1; }