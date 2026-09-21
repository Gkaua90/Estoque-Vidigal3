# Estoque Vidigal

Sistema de controle de estoque e distribuição de vinhos: depósito, produtos com foto,
entrada e saída com baixa automática, notas de saída, contagens de inventário,
histórico de movimentações, relatórios com exportação em Excel, usuários com
permissões e login real.

Esta versão roda como um site (frontend) conectado a um banco de dados na nuvem
(Supabase) — diferente das versões anteriores, que eram um único arquivo HTML.
Isso significa que o estoque agora é **o mesmo para todo mundo, em qualquer
aparelho**, e que existe um **login de verdade** (validado no servidor, não só
escondido na tela).

---

## 1. O que é o Estoque Vidigal

- **Estoque**: produtos com nome, código, classe, valor, quantidade, estoque
  mínimo, status (ativo/inativo) e foto opcional.
- **Entrada**: registra recebimento de mercadoria e aumenta o estoque.
- **Saída / Notas**: emite uma nota para uma loja, valida se há estoque
  suficiente e dá baixa automaticamente — tudo em uma única operação segura no
  banco (nunca fica "salvo pela metade").
- **Contagens**: contagem geral (mensal) ou semanal. Cada contagem é um retrato
  congelado do estoque naquele dia — nunca é recalculada depois. Depois de
  conferir, você decide se quer aplicar os ajustes ao estoque atual.
- **Histórico**: todo ENTRADA / SAÍDA / AJUSTE fica registrado, com usuário e data.
- **Relatórios**: por período, loja, classe ou produto, com exportação em Excel
  (5 abas: Resumo, Detalhamento, Por Loja, Por Classe, Estoque Atual).
- **Usuários e login**: administrador, operador e visualização, com permissões
  reais aplicadas no banco de dados (não só escondendo botões na tela).

## 2. Tecnologias utilizadas

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | JavaScript puro (módulos ES) + Vite | Simples de manter, sem a complexidade de um framework grande |
| Estilo | CSS puro, mobile-first | Leve, sem dependências extras |
| Gráficos | Chart.js | Gráficos leves no Dashboard |
| Excel | SheetJS (xlsx) | Geração do relatório .xlsx |
| Backend / banco | Supabase (PostgreSQL + Auth + Storage) | Banco real na nuvem, login de verdade, fotos, tudo com o mesmo provedor |
| Hospedagem do site | GitHub Pages, Vercel ou Netlify (você escolhe) | Serve o frontend; o banco continua no Supabase |

## 3. Estrutura de pastas

```
estoque-vidigal/
├── index.html              → página única do app
├── package.json            → dependências e scripts (npm run dev / build)
├── .env.example             → modelo das variáveis de configuração
├── .gitignore
├── src/
│   ├── main.js              → ponto de entrada: login, navegação, monta as páginas
│   ├── config.js            → lê as variáveis de ambiente (URL e chave do Supabase)
│   ├── state.js              → dados carregados na tela (produtos, lojas, classes, usuário logado)
│   ├── utils.js              → funções auxiliares (formatação de moeda, datas etc.)
│   ├── services/             → toda a comunicação com o Supabase (um arquivo por assunto)
│   ├── pages/                 → uma página por tela (dashboard, estoque, entrada...)
│   ├── components/            → pedaços reutilizáveis de tela (cabeçalho, menu, modal, ícones...)
│   └── styles/                → base.css, layout.css, components.css, responsive.css
└── supabase/
    ├── schema.sql             → cria as tabelas
    ├── functions.sql           → funções que fazem entrada/saída/ajuste de forma seguray
    ├── policies.sql            → regras de permissão (RLS) — a segurança de verdade
    ├── seed.sql                → dados iniciais (classes, lojas, produtos, admin)
    └── functions/create-user/  → função opcional para o admin criar logins pelo app
```

## 4. Como instalar (no seu computador)

Pré-requisito: ter o [Node.js](https://nodejs.org) instalado (versão 18 ou mais nova).

```bash
cd estoque-vidigal
npm install
```

## 5. Como configurar o Supabase (o banco de dados)

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e clique em
   **New Project**. Anote a senha do banco que você definir ali (não é a mesma
   coisa do login do sistema).
2. Espere o projeto terminar de ser criado (leva 1-2 minutos).
3. No menu esquerdo, abra **SQL Editor** → **New query**.
4. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o conteúdo,
   cole no SQL Editor e clique em **Run**.
5. Repita o mesmo processo, nesta ordem, com:
   - `supabase/functions.sql`
   - `supabase/policies.sql`
   - `supabase/seed.sql` (isso já cadastra as classes, lojas e produtos iniciais)

## 6. Como criar o administrador (Gabriel)

1. No painel do Supabase, vá em **Authentication → Users → Add user**.
2. Preencha um e-mail (pode ser um seu de verdade, ex.: `gabriel@seudominio.com`)
   e a senha `7858` (ou outra de sua escolha). Marque **Auto Confirm User**.
3. Clique no usuário criado e copie o **User UID** (um código como
   `a1b2c3d4-...`).
4. Volte ao **SQL Editor**, cole e rode (trocando o UID):
   ```sql
   update public.profiles
     set nome = 'Gabriel', perfil = 'administrador', status = 'ativo'
     where id = 'COLE-O-UID-AQUI';
   ```
5. Pronto — esse e-mail e senha já são o login do administrador.

> Por que não simplesmente "criar direto"? Porque a senha precisa ser validada
> pelo Supabase Auth (protegida de verdade), e isso só existe depois que a
> conta é criada pelo painel — é o jeito seguro de fazer.

## 7. Configurar as variáveis do projeto

1. No painel do Supabase: **Project Settings → API**.
2. Copie **Project URL** e **anon public key**.
3. No projeto, copie `.env.example` para um novo arquivo chamado `.env`.
4. Preencha:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```
5. **Nunca** copie a chave "service_role" para esse arquivo.

## 8. Rodar localmente

```bash
npm run dev
```

Abra o endereço que aparecer no terminal (geralmente `http://localhost:5173`).
Faça login com o e-mail/senha do Gabriel criado no passo 6.

## 9. Como criar outros usuários (operador / visualização)

**Caminho simples (recomendado para começar):**
1. Supabase → Authentication → Users → Add user (e-mail + senha do novo funcionário).
2. No app, entre como administrador → **Usuários** → clique no usuário recém-criado
   (ele aparece automaticamente, com perfil "Visualização" por padrão) → mude o
   nome e o perfil (Operador/Administrador) → Salvar.

**Caminho avançado (opcional):** publicar a função `supabase/functions/create-user`
como uma Edge Function permite criar o login inteiro (e-mail + senha) direto pelo
botão "Novo usuário" do app, sem abrir o painel do Supabase. Requer a
[CLI do Supabase](https://supabase.com/docs/guides/cli) instalada:
```bash
supabase login
supabase link --project-ref SEU-PROJECT-REF
supabase functions deploy create-user
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=cole-a-chave-service_role-aqui
```
A chave `service_role` fica só nesse "secret" do servidor — nunca no seu
computador além desse comando, nunca no GitHub, nunca no frontend.

## 10. Publicar no GitHub

```bash
git init
git add .
git commit -m "Estoque Vidigal — versão inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/estoque-vidigal.git
git push -u origin main
```
O `.gitignore` já impede que o arquivo `.env` (com suas chaves) vá para o
GitHub — confirme que `git status` não lista `.env` antes do primeiro commit.

Se você nunca criou um repositório: entre em [github.com](https://github.com) →
botão verde **New** → dê o nome `estoque-vidigal` → deixe "Public" ou "Private"
(tanto faz para isso funcionar) → **Create repository**. O GitHub mostra os
mesmos comandos acima, já com a URL certa do seu usuário — é só copiar de lá.

## 11. Publicar o site no Netlify (deploy)

Este projeto já vem com um arquivo `netlify.toml` pronto — o Netlify lê ele
sozinho, você só precisa conectar a conta.

1. Entre em [app.netlify.com](https://app.netlify.com) e crie uma conta grátis
   (dá para entrar direto com o GitHub).
2. Clique em **Add new site → Import an existing project**.
3. Escolha **GitHub** e autorize o Netlify a acessar seus repositórios.
4. Selecione o repositório `estoque-vidigal` que você acabou de subir.
5. O Netlify já vai preencher sozinho:
   - Build command: `npm run build`
   - Publish directory: `dist`
   (isso vem do `netlify.toml` — não precisa digitar nada aqui.)
6. Antes de clicar em Deploy, abra **Add environment variables** e adicione
   as duas, com os mesmos valores do seu `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Clique em **Deploy estoque-vidigal**. Depois de 1-2 minutos, o Netlify
   te dá um link tipo `https://estoque-vidigal-xyz123.netlify.app` — esse já
   é o site funcionando de verdade, acessível de qualquer aparelho.
8. (Opcional) Em **Site settings → Domain management** dá para trocar esse
   endereço por um nome mais simples (ainda dentro do domínio `.netlify.app`,
   de graça) ou ligar um domínio próprio se você tiver um.

**Atualizações depois disso:** toda vez que você der `git push` para o `main`,
o Netlify detecta sozinho e publica a nova versão automaticamente — não
precisa repetir o passo a passo.

**GitHub Pages** também funciona como alternativa, mas exige configurar o
`base` do Vite e um workflow de build manual — o Netlify é mais direto para
quem não é programador avançado, por isso é o caminho recomendado aqui.

## 12. Acessar pelo celular

Depois de publicado, abra o link (ex.: `https://estoque-vidigal.vercel.app`) no
navegador do celular e faça login normalmente. Para deixar com "cara de app",
use "Adicionar à tela de início" no menu do navegador (Chrome/Safari).

## 13. Backup

- **Automático**: o Supabase já faz backups diários do banco no plano gratuito
  (retenção menor) e backups configuráveis nos planos pagos — veja
  Project Settings → Database → Backups no seu painel.
- **Manual, pelo próprio app**: menu lateral (ou "Mais" no celular) → *Backup /
  importar* → **Exportar backup completo** baixa um `.json` com tudo. Guarde
  esse arquivo periodicamente (ex.: uma vez por semana) em local seguro (Google
  Drive, e-mail para você mesmo etc.).
- **Fotos dos produtos**: ficam no Supabase Storage (bucket `product-images`),
  separado do banco — não entram no JSON de backup. O Storage tem sua própria
  redundância no Supabase.

## 14. Migrar dados da versão antiga (o arquivo HTML único)

Se você ainda tem o sistema antigo (o arquivo `estoque-vidigal.html`) com dados
importantes:

1. Abra o arquivo antigo no navegador.
2. Adicione um botão de exportação (ou, se já tiver ficado sem acesso a esse
   código, me avise — posso gerar um exportador rápido) que baixe um JSON com
   o formato: `{ classes: [...nomes], lojas: [...], produtos: [...], notas: [...],
   movimentos: [...], contagens: [...] }` — é basicamente o que já ficava
   guardado em `window.storage` nessa versão.
3. No sistema novo, logado como administrador: menu → **Backup / importar** →
   selecione o arquivo → **Importar arquivo selecionado**.
4. Acompanhe o log na tela. Rode a importação **uma única vez** — rodar de novo
   duplica os registros (a Seção 34 do seu pedido original também previa isso).
5. As fotos dos produtos (que na versão antiga ficavam como imagem embutida no
   próprio registro) não são migradas automaticamente — reenvie-as pela tela de
   Estoque depois da importação, produto por produto.

## 15. Limitações importantes — leia com atenção

Sendo direto sobre o que **não** dá para fingir que está pronto:

- **Eu não consegui testar isso "no ar"**: não tenho acesso à internet neste
  ambiente para criar seu projeto Supabase de verdade, criar o repositório no
  GitHub, criar o site no Netlify, rodar `npm install`, ou testar dois
  dispositivos ao mesmo tempo. Validei a sintaxe de cada arquivo JavaScript e
  revisei o SQL e o `netlify.toml` com cuidado, mas o teste real só acontece
  quando você seguir os passos acima no seu próprio ambiente. Se aparecer
  algum erro nesse processo, me mostre a mensagem exata que eu ajusto.
- **Criar login pelo app** (sem abrir o painel do Supabase) depende da Edge
  Function opcional da Seção 9 — sem publicá-la, use o caminho simples (criar
  no painel + editar perfil no app), que já é seguro e funciona bem.
- **GitHub Pages** não roda código de servidor — mas este projeto não precisa
  disso: o "servidor" é o Supabase, então GitHub Pages/Vercel/Netlify servem
  apenas os arquivos estáticos do frontend normalmente.
- **Concorrência**: duas pessoas mexendo no mesmo produto ao mesmo tempo são
  resolvidas dentro do banco (a função trava a linha do produto durante a
  operação — ver comentários em `supabase/functions.sql`), então o estoque não
  fica inconsistente mesmo em uso simultâneo.

## 16. Prioridade de leitura, se algo der errado

1. Erro ao rodar `npm install` ou `npm run dev` → confira a versão do Node
   (`node -v`, precisa ser 18+).
2. Tela em branco com mensagem "Configuração pendente" → confira o `.env`.
3. "Sem permissão" ao tentar salvar algo → confira o perfil do seu usuário na
   tabela `profiles` (Supabase → Table Editor → profiles).
4. Erro estranho de SQL ao rodar os arquivos `.sql` → rode `schema.sql`,
   `functions.sql`, `policies.sql` e `seed.sql` **nessa ordem exata**, cada um
   até o fim, antes de rodar o próximo.
