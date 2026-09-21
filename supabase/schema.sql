-- ============================================================
-- ESTOQUE VIDIGAL — SCHEMA DO BANCO (PostgreSQL / Supabase)
-- ============================================================
-- Execute este arquivo inteiro no SQL Editor do Supabase, uma vez,
-- em um projeto novo. Ele cria as tabelas, índices, e as funções
-- auxiliares de permissão. As políticas de RLS estão em policies.sql
-- e as funções transacionais (RPC) estão em functions.sql — rode
-- os três arquivos NESSA ORDEM: schema.sql → functions.sql → policies.sql.

create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ------------------------------------------------------------
-- PROFILES — um perfil por usuário do Supabase Auth (auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  perfil text not null default 'visualizacao' check (perfil in ('administrador','operador','visualizacao')),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Dados de perfil de cada usuário autenticado (nome, perfil de acesso, status).';

-- Cria automaticamente um profile (perfil "visualizacao" por padrão) sempre
-- que um novo usuário é criado no Supabase Auth (ex.: pelo painel do Supabase).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, perfil, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), 'visualizacao', 'ativo')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- CLASSES (Tinto, Rosé, Blanc, Espumante, Branco, Outros...)
-- ------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- STORES (lojas / clientes)
-- ------------------------------------------------------------
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text,
  cnpj text,
  endereco text,
  estado text,
  banco text,
  agencia text,
  conta text,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_stores_status on public.stores(status);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text unique,
  classe_id uuid references public.classes(id),
  valor_unitario numeric(12,2) not null default 0 check (valor_unitario >= 0),
  quantidade integer not null default 0 check (quantidade >= 0),
  estoque_minimo integer not null default 50 check (estoque_minimo >= 0),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  imagem_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_classe on public.products(classe_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_nome on public.products using gin (to_tsvector('simple', nome));

-- trava usada pelas funções RPC para permitir mudança de "quantidade"
-- somente através delas (ver comentário na trigger abaixo)
create or replace function public.prevent_direct_quantity_change()
returns trigger
language plpgsql
as $$
begin
  if new.quantidade <> old.quantidade
     and coalesce(current_setting('app.allow_quantity_change', true), '') <> 'on' then
    raise exception 'A quantidade em estoque só pode ser alterada por entrada, saída, ajuste ou contagem (use as telas do sistema).';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_products_guard_quantity on public.products;
create trigger trg_products_guard_quantity
  before update on public.products
  for each row execute function public.prevent_direct_quantity_change();

-- ------------------------------------------------------------
-- INVOICES (notas de saída) + INVOICE_ITEMS
-- ------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  data date not null,
  store_id uuid references public.stores(id),
  status text not null default 'emitida' check (status in ('emitida','cancelada')),
  total numeric(12,2) not null default 0,
  criado_por uuid references public.profiles(id),
  cancelado_por uuid references public.profiles(id),
  cancelado_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz not null default now(),
  unique (numero)
);
create index if not exists idx_invoices_data on public.invoices(data);
create index if not exists idx_invoices_store on public.invoices(store_id);
create index if not exists idx_invoices_status on public.invoices(status);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id),
  produto_nome text not null,
  classe_id uuid references public.classes(id),
  classe_nome text,
  quantidade integer not null check (quantidade > 0),
  valor_unitario numeric(12,2) not null,
  valor_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index if not exists idx_invoice_items_product on public.invoice_items(product_id);

-- ------------------------------------------------------------
-- STOCK_MOVEMENTS (histórico: ENTRADA / SAIDA / AJUSTE)
-- ------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ENTRADA','SAIDA','AJUSTE')),
  product_id uuid references public.products(id),
  produto_nome text not null,
  classe_nome text,
  quantidade integer not null, -- delta: positivo entrada/sobra, negativo saída/falta
  estoque_resultante integer not null,
  referencia text,
  descricao text,
  data date not null default current_date,
  usuario_id uuid references public.profiles(id),
  usuario_nome text,
  created_at timestamptz not null default now()
);
create index if not exists idx_movements_product on public.stock_movements(product_id);
create index if not exists idx_movements_data on public.stock_movements(data);
create index if not exists idx_movements_tipo on public.stock_movements(tipo);

-- ------------------------------------------------------------
-- INVENTORY_COUNTS (contagens) + INVENTORY_COUNT_ITEMS (snapshot)
-- ------------------------------------------------------------
create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('geral','semanal')),
  data date not null,
  observacao text,
  status text not null default 'conferida' check (status in ('conferida','ajustada')),
  criado_por uuid references public.profiles(id),
  ajustado_por uuid references public.profiles(id),
  ajustado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_counts_data on public.inventory_counts(data);

create table if not exists public.inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inventory_counts(id) on delete cascade,
  product_id uuid references public.products(id),
  produto_nome text not null,   -- congelado no momento da contagem
  classe_nome text,             -- congelado no momento da contagem
  sistema integer not null,     -- estoque do sistema no momento da contagem
  contado integer not null,     -- quantidade contada fisicamente
  diferenca integer generated always as (contado - sistema) stored,
  created_at timestamptz not null default now()
);
create index if not exists idx_count_items_count on public.inventory_count_items(count_id);
create index if not exists idx_count_items_product on public.inventory_count_items(product_id);

-- ------------------------------------------------------------
-- updated_at automático
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_stores_updated on public.stores;
create trigger trg_stores_updated before update on public.stores for each row execute function public.set_updated_at();
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- FUNÇÕES AUXILIARES DE PERMISSÃO (usadas pelas policies de RLS)
-- security definer: leem "profiles" sem cair em recursão de RLS
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and perfil = 'administrador' and status = 'ativo'
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and perfil in ('administrador','operador') and status = 'ativo'
  );
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and status = 'ativo'
  );
$$;
