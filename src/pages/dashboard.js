import { state } from '../state.js';
import { brl, fmtDate, fmtDateObj, isLowStock, proximaDataGeral, proximaSegunda, todayISO } from '../utils.js';
import { listarNotas } from '../services/notas.js';
import { listarContagens } from '../services/contagens.js';
import { paintChart, chartPalette } from '../components/charts.js';

export async function viewDashboard() {
  const ativos = state.produtos.filter(p => p.status !== 'inativo');
  const unidades = ativos.reduce((s, p) => s + p.quantidade, 0);
  const valorEstoque = ativos.reduce((s, p) => s + p.quantidade * p.valorUnitario, 0);
  const estoqueBaixo = ativos.filter(isLowStock).length;

  const seiseMesesAtras = new Date(); seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);
  const [notas6meses, contagens] = await Promise.all([
    listarNotas({ de: seiseMesesAtras.toISOString().slice(0, 10), ate: todayISO(), limite: 500 }),
    listarContagens(),
  ]);
  const notas6 = notas6meses.filter(n => n.status !== 'cancelada');

  const de30 = new Date(); de30.setDate(de30.getDate() - 29);
  const de30ISO = de30.toISOString().slice(0, 10);
  const notasPeriodo = notas6.filter(n => n.data >= de30ISO);
  const valorVendidoPeriodo = notasPeriodo.reduce((s, n) => s + n.total, 0);

  const ultimaContagem = contagens[0];
  const divergenciasUltima = ultimaContagem ? ultimaContagem.itens.filter(it => it.diferenca !== 0).length : null;

  const html = `
    <h2 class="section-title">Painel</h2>
    <p class="subtle" style="margin:0 0 14px;">Visão geral do depósito e das saídas dos últimos 30 dias.</p>
    <div class="dashboard-grid">
      <div class="card dashboard-card"><div class="lbl">VALOR DO ESTOQUE</div><div class="val">${brl(valorEstoque)}</div></div>
      <div class="card dashboard-card"><div class="lbl">UNIDADES EM ESTOQUE</div><div class="val">${unidades}</div></div>
      <div class="card dashboard-card"><div class="lbl">PRODUTOS CADASTRADOS</div><div class="val">${state.produtos.length}</div></div>
      <div class="card dashboard-card ${estoqueBaixo > 0 ? 'warn' : ''}"><div class="lbl">ESTOQUE BAIXO</div><div class="val">${estoqueBaixo}</div></div>
      <div class="card dashboard-card"><div class="lbl">NOTAS (30 DIAS)</div><div class="val">${notasPeriodo.length}</div></div>
      <div class="card dashboard-card"><div class="lbl">VENDIDO (30 DIAS)</div><div class="val">${brl(valorVendidoPeriodo)}</div></div>
      <div class="card dashboard-card"><div class="lbl">ÚLTIMA CONTAGEM</div><div class="val small">${ultimaContagem ? fmtDate(ultimaContagem.data) : '—'}</div>${ultimaContagem ? `<div class="subtle" style="margin-top:2px;">${ultimaContagem.tipo === 'geral' ? 'Geral' : 'Semanal'} · ${divergenciasUltima} divergência(s)</div>` : ''}</div>
      <div class="card dashboard-card"><div class="lbl">PRÓXIMA CONTAGEM GERAL</div><div class="val small">${fmtDateObj(proximaDataGeral())}</div></div>
      <div class="card dashboard-card"><div class="lbl">PRÓXIMA CONTAGEM SEMANAL</div><div class="val small">${fmtDateObj(proximaSegunda())}</div></div>
    </div>
    <div class="charts-grid">
      <div class="card chart-card"><h4>Saídas por mês</h4><div class="chart-wrap"><canvas id="ch-mes"></canvas></div></div>
      <div class="card chart-card"><h4>Vendas por loja</h4><div class="chart-wrap"><canvas id="ch-loja"></canvas></div></div>
      <div class="card chart-card"><h4>Vendas por classe</h4><div class="chart-wrap"><canvas id="ch-classe"></canvas></div></div>
      <div class="card chart-card"><h4>Produtos mais vendidos</h4><div class="chart-wrap"><canvas id="ch-produto"></canvas></div></div>
    </div>
  `;
  return { html, bind: () => desenharGraficos(notas6) };
}

function desenharGraficos(notas) {
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    meses.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: d.toLocaleDateString('pt-BR', { month: 'short' }) });
  }
  const porMes = meses.map(m => notas.filter(n => n.data.slice(0, 7) === m.key).reduce((s, n) => s + n.total, 0));
  paintChart('ch-mes', 'bar', meses.map(m => m.label), [{ label: 'Valor vendido', data: porMes, backgroundColor: '#6B1F2A' }]);

  const porLoja = {};
  notas.forEach(n => { porLoja[n.lojaNome] = (porLoja[n.lojaNome] || 0) + n.total; });
  const lojaEntries = Object.entries(porLoja).sort((a, b) => b[1] - a[1]).slice(0, 6);
  paintChart('ch-loja', 'bar', lojaEntries.map(e => e[0]), [{ label: 'Valor', data: lojaEntries.map(e => e[1]), backgroundColor: '#9C7A3C' }]);

  const porClasse = {};
  notas.forEach(n => n.itens.forEach(it => { const c = it.classe || 'Outros'; porClasse[c] = (porClasse[c] || 0) + it.valorTotal; }));
  const classeEntries = Object.entries(porClasse).sort((a, b) => b[1] - a[1]);
  paintChart('ch-classe', 'doughnut', classeEntries.map(e => e[0]), [{ data: classeEntries.map(e => e[1]), backgroundColor: chartPalette() }]);

  const porProduto = {};
  notas.forEach(n => n.itens.forEach(it => { porProduto[it.produtoNome] = (porProduto[it.produtoNome] || 0) + it.quantidade; }));
  const prodEntries = Object.entries(porProduto).sort((a, b) => b[1] - a[1]).slice(0, 5);
  paintChart('ch-produto', 'bar', prodEntries.map(e => e[0]), [{ label: 'Unidades', data: prodEntries.map(e => e[1]), backgroundColor: '#4E6142' }], true);
}
