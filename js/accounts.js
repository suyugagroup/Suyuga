// js/accounts.js
import { supabase } from './supabase-client.js';

export async function listAccounts() {
  const { data, error } = await supabase
    .from('accounts').select('*').eq('is_active', true).order('code');
  if (error) throw error;
  return data;
}

export async function createAccount({ code, name, type, normal_balance }) {
  const { data, error } = await supabase
    .from('accounts').insert({ code, name, type, normal_balance, is_active: true })
    .select().single();
  if (error) throw error;
  return data;
}