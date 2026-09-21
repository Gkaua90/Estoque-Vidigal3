// Lê as variáveis de ambiente configuradas no ".env" (veja .env.example).
// Vite só expõe variáveis prefixadas com VITE_ para o código do navegador —
// isso é proposital: é a garantia de que nenhuma variável "secreta" (sem o
// prefixo VITE_) vaza para o bundle final por engano.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Mensagem amigável em vez de a tela ficar em branco sem explicação.
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('app');
    if (el) {
      el.innerHTML = `
        <div style="max-width:420px;margin:60px auto;padding:24px;font-family:sans-serif;line-height:1.5;">
          <h2>Configuração pendente</h2>
          <p>As variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>
          não foram encontradas.</p>
          <p>Copie o arquivo <code>.env.example</code> para <code>.env</code> e preencha
          com os dados do seu projeto Supabase (Project Settings → API).</p>
        </div>`;
    }
  });
  throw new Error('Variáveis de ambiente do Supabase ausentes. Veja .env.example.');
}

export const LOW_STOCK_DEFAULT = 50;
