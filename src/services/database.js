import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

// Único ponto de conexão com o Supabase. Todo o resto do app importa
// "supabase" a partir daqui — nunca cria um segundo client.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,   // mantém a sessão entre recarregamentos da página
    autoRefreshToken: true, // renova o token sozinho antes de expirar
  },
});
