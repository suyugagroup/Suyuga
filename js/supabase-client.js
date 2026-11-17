// js/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://yfehadpofsnzevrnjysh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AxIAM2dQLVNNRJBkiF62Sw__BbV-HXJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;