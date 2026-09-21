import { ICONS } from '../components/icons.js';
import { state } from '../state.js';
import { escapeHtml, brl, classeBadgeClass } from '../utils.js';
import { showToast } from '../components/modal.js';
import { buscarItensPeriodo, exportarExcel } from '../services/relatorios.js';
import { listarMovimentos } from '../services/movimentacoes.js';
import { listarContagens } from '../services/contagens.js';

function last7DaysRange() {
  const ate = new Date(); const de = new Date(); de.setDate(de.getDate() - 6);
  return { de: de.toISOString().slice(0, 10), ate: ate.toISOString().slice(0, 10) };
}

let ITENS_CACHE = [];

export async function viewRelatorios() {
  if (!state.filtroRel.de && !state.filtroRel.ate) { const r = last7DaysRange(); state.filtroRel.de = r.de; state.filtroRel.ate = r.ate; }
  const f = state.filtroRel;
  ITENS_CACHE = await buscarItensPeriodo({ de: f.de, ate: f.ate, lojaId: f.loja, classe: f.classe, produtoId: f.produto });

  const lojaOpts = ['<option value="todas">Todas as lojas</option>'].concat(state.lojas.map(l => `<option value="${l.id}" ${f.loja === l.id ? 'selected' : ''}>${escapeHtml(l.nome)}</option>`)).join('');
  const classeOpts = ['<option value="todas">Todas as classes</option>'].concat(state.classes.map(c => `<option value="${escapeHtml(c.nome)}" ${f.classe === c.nome ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`)).join('');
  const produtoOpts = ['<option value="todas">Todos os produtos</option>'].concat(state.produtos.map(p => `<option value="${p.id}" ${f.produto === p.id ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`)).join('');

  const totalUnidades = ITENS_CACHE.reduce((s, it) => s + it.quantidade, 0);
  const totalValor = ITENS_CACHE.reduce((s, it) => s + it.valorTotal, 0);
  const notasEnvolvidas = new Set(ITENS_CACHE.map(it => it.notaNumero + it.lojaId)).size;

  const porProduto = {};
  ITENS_CACHE.forEach(it => { if (!porProduto[it.produtoNome]) porProduto[it.produtoNome] = { qtd: 0, valor: 0 }; porProduto[it.produtoNome].qtd += it.quantidade; porProduto[it.produtoNome].valor += it.valorTotal; });
  const listaProduto = Object.entries(porProduto).sort((a, b) => b[1].valor - a[1].valor);

  const porLoja = {};
  ITENS_CACHE.forEach(it => { if (!porLoja[it.lojaNome]) porLoja[it.lojaNome] = { qtd: 0, valor: 0, notas: new Set() }; porLoja[it.lojaNome].qtd += it.quantidade; porLoja[it.lojaNome].valor += it.valorTotal; porLoja[it.lojaNome].notas.add(it.notaNumero); });
  const listaLoja = Object.entries(porLoja).sort((a, b) => b[1].valor - a[1].valor);

  const porClasse = {};
  ITENS_CACHE.forEach(it => { const c = it.classe || 'Outros'; if (!porClasse[c]) porClasse[c] = { qtd: 0, valor: 0 }; porClasse[c].qtd += it.quantidade; porClasse[c].valor += it.valorTotal; });
  const listaClasse = Object.entries(porClasse).sort((a, b) => b[1].valor - a[1].valor);

  const valorEstoqueAtual = state.produtos.filter(p => p.status !== 'inativo').reduce((s, p) => s + p.quantidade * p.valorUnitario, 0);

  const tabProduto = listaProduto.length ? `<div class="table-wrap"><table class="rep-table"><tr><th>Produto</th><th>Qtd</th><th>Valor</th></tr>
    ${listaProduto.map(([nome, v]) => `<tr><td>${escapeHtml(nome)}</td><td>${v.qtd}</td><td>${brl(v.valor)}</td></tr>`).join('')}
    <tr><td>Total</td><td>${totalUnidades}</td><td>${brl(totalValor)}</td></tr></table></div>` : `<p class="subtle">Nenhuma saída no período com esse filtro.</p>`;

  const tabLoja = listaLoja.length ? `<div class="table-wrap"><table class="rep-table"><tr><th>Loja</th><th>Notas</th><th>Qtd</th><th>Valor</th></tr>
    ${listaLoja.map(([nome, v]) => `<tr><td>${escapeHtml(nome)}</td><td>${v.notas.size}</td><td>${v.qtd}</td><td>${brl(v.valor)}</td></tr>`).join('')}</table></div>` : '';

  const tabClasse = listaClasse.length ? `<div class="table-wrap"><table class="rep-table"><tr><th>Classe</th><th>Qtd</th><th>Valor</th></tr>
    ${listaClasse.map(([c, v]) => `<tr><td><span class="badge ${classeBadgeClass(c)}">${escapeHtml(c)}</span></td><td>${v.qtd}</td><td>${brl(v.valor)}</td></tr>`).join('')}</table></div>` : '';

  return `
    <h2 class="section-title">Relatórios</h2>
    <div class="card filter-card">
      <div class="row" style="margin-bottom:10px;">
        <div class="field grow" style="margin-bottom:0;"><label class="field-label">De</label><input id="rel-de" type="date" value="${f.de}"></div>
        <div class="field grow" style="margin-bottom:0;"><label class="field-label">Até</label><input id="rel-ate" type="date" value="${f.ate}"></div>
      </div>
      <div class="row" style="margin-bottom:10px;">
        <div class="field grow" style="margin-bottom:0;"><label class="field-label">Loja</label><select id="rel-loja">${lojaOpts}</select></div>
        <div class="field grow" style="margin-bottom:0;"><label class="field-label">Classe</label><select id="rel-classe">${classeOpts}</select></div>
      </div>
      <div class="field" style="margin-bottom:0;"><label class="field-label">Produto</label><select id="rel-produto">${produtoOpts}</select></div>
    </div>
    <div class="stats-grid">
      <div class="card stat-card"><div class="lbl">TOTAL DE UNIDADES</div><div class="val">${totalUnidades}</div></div>
      <div class="card stat-card"><div class="lbl">TOTAL EM R$</div><div class="val">${brl(totalValor)}</div></div>
      <div class="card stat-card"><div class="lbl">NOTAS NO PERÍODO</div><div class="val">${notasEnvolvidas}</div></div>
      <div class="card stat-card"><div class="lbl">VALOR EM ESTOQUE HOJE</div><div class="val">${brl(valorEstoqueAtual)}</div></div>
    </div>
    <div class="rep-title">Saídas por produto</div>${tabProduto}
    ${listaLoja.length ? `<div class="rep-title">Saídas por loja</div>${tabLoja}` : ''}
    ${listaClasse.length ? `<div class="rep-title">Saídas por classe</div>${tabClasse}` : ''}
    <button class="btn btn-primary" id="btn-export-excel" style="margin-top:6px;">${ICONS.download} Exportar Excel</button>
  `;
}

export function bindRelatorios(reRender) {
  const de = document.getElementById('rel-de');
  if (!de) return;
  de.addEventListener('change', e => { state.filtroRel.de = e.target.value; reRender(); });
  document.getElementById('rel-ate').addEventListener('change', e => { state.filtroRel.ate = e.target.value; reRender(); });
  document.getElementById('rel-loja').addEventListener('change', e => { state.filtroRel.loja = e.target.value; reRender(); });
  document.getElementById('rel-classe').addEventListener('change', e => { state.filtroRel.classe = e.target.value; reRender(); });
  document.getElementById('rel-produto').addEventListener('change', e => { state.filtroRel.produto = e.target.value; reRender(); });
  document.getElementById('btn-export-excel').addEventListener('click', async () => {
    try {
      const f = state.filtroRel;
      const lojaFiltroNome = f.loja === 'todas' ? 'Todas' : (state.lojas.find(l => l.id === f.loja) || {}).nome;
      const [movimentos, contagens] = await Promise.all([
        listarMovimentos({ de: f.de, ate: f.ate, limite: 1000 }),
        listarContagens(),
      ]);
      exportarExcel({
        de: f.de, ate: f.ate, lojaFiltroNome, classeFiltro: f.classe,
        itens: ITENS_CACHE, movimentos, contagens: contagens.filter(c => c.data >= f.de && c.data <= f.ate),
        produtos: state.produtos,
      });
      showToast('Relatório exportado.');
    } catch (e) { showToast('Erro ao exportar: ' + e.message); }
  });
}
