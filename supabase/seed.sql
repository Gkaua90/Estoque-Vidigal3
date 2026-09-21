-- ============================================================
-- ESTOQUE VIDIGAL — DADOS INICIAIS (seed)
-- ============================================================
-- Rode depois de schema.sql + functions.sql + policies.sql.
-- Usa ON CONFLICT em colunas únicas (nome/codigo) então é seguro
-- rodar mais de uma vez — não duplica registros.

insert into public.classes (nome) values
  ('Tinto'), ('Rosé'), ('Blanc'), ('Espumante'), ('Branco'), ('Outros')
on conflict (nome) do nothing;

insert into public.stores (nome, razao_social, cnpj, endereco, estado, banco, agencia, conta, status) values
  ('S-Bistro','S-Bistro Bar e Restaurante','39.269.124/0001-02','Rua Conde de Irajá, 288','Rio de Janeiro, RJ','','','','ativo'),
  ('Le Pule','LAG Produtos Nutricionais','00.661/0001-05','Rua Jangadeiros 10, Loja A','Rio de Janeiro, RJ','','','','ativo'),
  ('La Fabrique','La Fabrique Restaurantes','12.977.570/0001-16','Princesa Isabel, 300','Rio de Janeiro, RJ','Itau','40747','15361-2','ativo'),
  ('Botafogo-Rosé','Bar e Vinho Francês','30.703.380/0001-91','Rua Álvaro Ramos, 154','Rio de Janeiro, RJ','','','','ativo'),
  ('Pizzaria Ipanema','Bar B Vinho','21.494.386/0001-05','Rua Jangadeiros 42, Loja H','Rio de Janeiro, RJ','Itau','6006','18445-8','ativo'),
  ('Pizzaria Leme','V Tolstoi Restaurante','42.839.976/0001-00','Av. Atlântica, 994','Rio de Janeiro, RJ','Itau','6179','42839976000100','ativo'),
  ('Barra','T.M.C de Bulhões','40.208.444/0001-31','Av. Pepe, 780','Rio de Janeiro, RJ','Itau','6179','99892-4','ativo'),
  ('Leblon','Moreau e Stern Gastronomie Bar e Buffet LTDA','21.616.187/0001-22','Rua Dias Ferreiras, 64','Rio de Janeiro, RJ','Santander','4688','13002838-1','ativo'),
  ('Vidigal','GJA Franchising 40.271.667/0001-43','40.271.667/0001-43','','Rio de Janeiro, RJ','Itau','6179','0099815-5','ativo'),
  ('Vinho','Sr. Transporte EIRELE 83.196.857/0001-56','83.196.857/0001-56','','Rio de Janeiro, RJ','Unicred','1410','734592-5','ativo'),
  ('Ipanema','','','','Rio de Janeiro, RJ','','','','ativo')
on conflict do nothing;

insert into public.products (nome, codigo, classe_id, valor_unitario, quantidade, estoque_minimo, status) values
  ('CM Merlot','VN-0001',(select id from public.classes where nome='Tinto'),55.83,816,50,'ativo'),
  ('Rosé Lt Provence','VN-0002',(select id from public.classes where nome='Rosé'),47.89,330,50,'ativo'),
  ('CM Sauvignon Blanc Org','VN-0003',(select id from public.classes where nome='Blanc'),53.69,1230,50,'ativo'),
  ('Syrah Bee','VN-0004',(select id from public.classes where nome='Tinto'),55.83,2310,50,'ativo'),
  ('Chinon Cabernet','VN-0005',(select id from public.classes where nome='Tinto'),73.27,12,50,'ativo')
on conflict (codigo) do nothing;

-- ------------------------------------------------------------
-- ADMINISTRADOR INICIAL (Gabriel) — leia com atenção
-- ------------------------------------------------------------
-- Este passo é feito em DUAS etapas porque criar um LOGIN (email +
-- senha) é responsabilidade do Supabase Auth, não de um "insert" de
-- SQL comum — é assim que a senha fica protegida de verdade.
--
-- 1) No painel do Supabase → Authentication → Users → "Add user":
--    Email: gabriel@estoquevidigal.com  (pode ser um e-mail real seu)
--    Password: 7858 (ou a senha que preferir agora — dá pra trocar depois)
--    Marque "Auto Confirm User".
--    Depois de criar, clique no usuário e copie o "User UID".
--
-- 2) Cole o UID copiado no lugar de SEU-UID-AQUI abaixo e rode SÓ esta
--    parte (o insert em classes/stores/products acima já pode ter
--    rodado junto, sem problema):

-- update public.profiles
--   set nome = 'Gabriel', perfil = 'administrador', status = 'ativo'
--   where id = 'SEU-UID-AQUI';

-- (o registro em "profiles" já existe nesse ponto, criado automaticamente
-- pela trigger handle_new_user() no instante em que você criou o usuário
-- no passo 1 — por isso aqui é um UPDATE, não um INSERT.)
