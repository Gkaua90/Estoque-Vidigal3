// ESTOQUE VIDIGAL — Edge Function opcional: "create-user"
//
// Isso é uma etapa AVANÇADA e OPCIONAL. Sem ela, o administrador ainda
// consegue criar usuários manualmente pelo painel do Supabase (veja o
// passo a passo no README, seção "Como criar novos usuários") — o que
// já é seguro e funciona bem no dia a dia. Esta função só existe para
// quem quiser o botão "Novo usuário" criando o LOGIN inteiro (e-mail +
// senha) direto de dentro do app, sem abrir o painel do Supabase.
//
// Por que isso precisa ser uma Edge Function (rodando no servidor do
// Supabase) e não uma chamada direta do navegador? Porque criar um
// login do zero exige a "service_role key" — uma chave que ignora
// todas as regras de segurança (RLS). Essa chave NUNCA pode chegar ao
// navegador do usuário. Aqui ela fica apenas como uma variável de
// ambiente do lado do servidor (um "secret" da Edge Function),
// inacessível a partir do código que roda no celular/computador de
// quem usa o sistema.
//
// Como publicar (linha de comando, uma vez):
//   supabase functions deploy create-user
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=coloque-aqui-a-chave
// (a service_role key fica em Project Settings → API → "service_role")

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const callerToken = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Cliente "como o usuário que chamou" — só para confirmar quem é e
    // checar se é administrador, usando a MESMA regra de RLS do resto
    // do sistema (nunca confie apenas no que o frontend afirma).
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: 'Não autenticado.' }, 401);
    }

    const { data: profile } = await callerClient
      .from('profiles')
      .select('perfil,status')
      .eq('id', userData.user.id)
      .single();

    if (!profile || profile.perfil !== 'administrador' || profile.status !== 'ativo') {
      return jsonResponse({ error: 'Somente administradores podem criar usuários.' }, 403);
    }

    const { nome, email, senha, perfil } = await req.json();
    if (!nome || !email || !senha || !perfil) {
      return jsonResponse({ error: 'Preencha nome, email, senha e perfil.' }, 400);
    }
    if (!['administrador', 'operador', 'visualizacao'].includes(perfil)) {
      return jsonResponse({ error: 'Perfil inválido.' }, 400);
    }

    // Cliente com privilégio total — só existe aqui dentro, nunca no navegador.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (createErr) return jsonResponse({ error: createErr.message }, 400);

    // A trigger handle_new_user() já criou a linha em "profiles" com
    // perfil "visualizacao" por padrão — aqui ajustamos para o perfil
    // escolhido pelo administrador.
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({ nome, perfil, status: 'ativo' })
      .eq('id', created.user.id);
    if (profileErr) return jsonResponse({ error: profileErr.message }, 400);

    return jsonResponse({ ok: true, id: created.user.id });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
