// js/partners.js
import { supabase } from './supabase-client.js';

export async function listPartners(type = null) {
  let q = supabase.from('partners').select('*').eq('is_active', true).order('name');
  if (type) q = q.in('type', [type, 'both']);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createPartner({ code, name, type, phone, email }) {
  const { data, error } = await supabase
    .from('partners').insert({ code, name, type, phone, email, is_active: true })
    .select().single();
  if (error) throw error;
  return data;
}