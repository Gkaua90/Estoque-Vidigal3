// Estado em memória do app. Diferente das versões anteriores (HTML
// único), aqui os dados "de verdade" moram no Supabase — este objeto
// só guarda o que foi carregado na tela + preferências de navegação
// (aba atual, filtros). Se a página for recarregada, tudo aqui reseta
// e é buscado de novo do banco — o que é o comportamento certo para
// um sistema com banco real.
export const state = {
  session: null,
  perfil: null, // {id, nome, perfil, status}

  tab: 'dashboard',
  produtos: [],
  classes: [],
  lojas: [],

  buscaProduto: '',
  filtroClasse: 'todas',
  filtroEstoqueView: 'ativos',
  ordenacao: 'nome',

  notaDraft: null,
  entradaDraft: null,
  contagemDraft: null,
  filtroContagemClasse: 'todas',

  filtroNotas: { loja: 'todas', de: '', ate: '', busca: '' },
  filtroHist: { tipo: 'todos', busca: '', de: '', ate: '' },
  filtroRel: { de: '', ate: '', loja: 'todas', classe: 'todas', produto: 'todas' },
};

export function isAdmin() { return state.perfil?.perfil === 'administrador'; }
export function podeEditar() { return state.perfil?.perfil === 'administrador' || state.perfil?.perfil === 'operador'; }
export function somenteLeitura() { return state.perfil?.perfil === 'visualizacao'; }
export function perfilLabel(p) {
  return p === 'administrador' ? 'Administrador' : p === 'operador' ? 'Operador' : 'Visualização';
}
