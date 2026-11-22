// js/bank-accounts.js
import { supabase } from './supabase-client.js';

export async function listBankAccounts({ activeOnly = false } = {}) {
  let q = supabase
    .from('bank_accounts')
    .select(`
      id, account_id, bank_name, account_no, account_name,
      branch, is_active, created_at, updated_at,
      accounts!account_id(code, name)
    `)
    .order('bank_name', { ascending: true });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getBankAccount(id) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select(`
      id, account_id, bank_name, account_no, account_name,
      branch, is_active,
      accounts!account_id(code, name)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createBankAccount({
  account_id, bank_name, account_no, account_name,
  branch = null, is_active = true
}) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      account_id, bank_name, account_no, account_name,
      branch, is_active
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBankAccount(id, {
  account_id, bank_name, account_no, account_name,
  branch, is_active
}) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .update({
      account_id, bank_name, account_no, account_name,
      branch: branch || null,
      is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBankAccount(id) {
  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function listBankCoaAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, code, name')
    .like('code', '1-11%')
    .eq('is_active', true)
    .order('code');
  if (error) throw error;
  return data || [];
}