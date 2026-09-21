import * as XLSX from 'xlsx';
import { supabase } from './database.js';

export async function buscarItensPeriodo({ de, ate, lojaId, classe, produtoId }) {
  let query = supabase
    .from('invoice_items')
    .select('*, invoices!inner(numero,data,status,store_id,stores(nome))')
    .eq('invoices.status', 'emitida')
    .gte('invoices.data', de)
    .lte('invoices.data', ate);
  if (lojaId && lojaId !== 'todas') query = query.eq('invoices.store_id', lojaId);
  if (produtoId && produtoId !== 'todas') query = query.eq('product_id', produtoId);
  if (classe && classe !== 'todas') query = query.eq('classe_nome', classe);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((it) => ({
    notaNumero: it.invoices.numero, notaData: it.invoices.data,
    lojaId: it.invoices.store_id, lojaNome: it.invoices.stores ? it.invoices.stores.nome : '—',
    produtoId: it.product_id, produtoNome: it.produto_nome, classe: it.classe_nome,
    quantidade: it.quantidade, valorUnitario: Number(it.valor_unitario), valorTotal: Number(it.valor_total),
  }));
}

export function exportarExcel({ de, ate, lojaFiltroNome, classeFiltro, itens, movimentos, contagens, produtos }) {
  const totalUnidades = itens.reduce((s, it) => s + it.quantidade, 0);
  const totalValor = itens.reduce((s, it) => s + it.valorTotal, 0);
  const notasUnicas = new Set(itens.map((it) => it.notaNumero + it.lojaId)).size;

  const resumo = [
    { Métrica: 'Período', Valor: `${de} a ${ate}` },
    { Métrica: 'Loja filtrada', Valor: lojaFiltroNome },
    { Métrica: 'Classe filtrada', Valor: classeFiltro },
    { Métrica: 'Total de unidades', Valor: totalUnidades },
    { Métrica: 'Total em R$', Valor: totalValor },
    { Métrica: 'Notas no período', Valor: notasUnicas },
  ];

  const detalhamento = itens.map((it) => ({
    Data: it.notaData, Nota: it.notaNumero, Loja: it.lojaNome, Produto: it.produtoNome,
    Classe: it.classe, Quantidade: it.quantidade, ['Vl. Unitário']: it.valorUnitario, ['Vl. Total']: it.valorTotal,
  }));

  const porLoja = {};
  itens.forEach((it) => {
    if (!porLoja[it.lojaNome]) porLoja[it.lojaNome] = { Loja: it.lojaNome, Notas: new Set(), Quantidade: 0, Valor: 0 };
    porLoja[it.lojaNome].Notas.add(it.notaNumero);
    porLoja[it.lojaNome].Quantidade += it.quantidade;
    porLoja[it.lojaNome].Valor += it.valorTotal;
  });
  const resumoLoja = Object.values(porLoja).map((l) => ({ Loja: l.Loja, Notas: l.Notas.size, Quantidade: l.Quantidade, Valor: l.Valor }));

  const porClasse = {};
  itens.forEach((it) => {
    const c = it.classe || 'Outros';
    if (!porClasse[c]) porClasse[c] = { Classe: c, Quantidade: 0, Valor: 0 };
    porClasse[c].Quantidade += it.quantidade;
    porClasse[c].Valor += it.valorTotal;
  });

  const estoqueAtual = produtos.map((p) => ({
    Código: p.codigo, Produto: p.nome, Classe: p.classe, Status: p.status,
    ['Vl. Unitário']: p.valorUnitario, Quantidade: p.quantidade,
    ['Valor em Estoque']: Math.round(p.quantidade * p.valorUnitario * 100) / 100,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalhamento.length ? detalhamento : [{}]), 'Detalhamento');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoLoja.length ? resumoLoja : [{}]), 'Por Loja');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.values(porClasse).length ? Object.values(porClasse) : [{}]), 'Por Classe');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(estoqueAtual), 'Estoque Atual');
  if (movimentos && movimentos.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movimentos.map(m => ({
      Data: m.data, Tipo: m.tipo, Produto: m.produtoNome, Classe: m.classe,
      Quantidade: m.quantidade, ['Estoque resultante']: m.estoqueResultante,
      Referência: m.referencia, Usuário: m.usuario,
    }))), 'Movimentações');
  }
  if (contagens && contagens.length) {
    const linhas = [];
    contagens.forEach(c => c.itens.forEach(it => linhas.push({
      Data: c.data, Tipo: c.tipo, Produto: it.produtoNome, Sistema: it.sistema, Contado: it.contado, Diferença: it.diferenca,
    })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.length ? linhas : [{}]), 'Contagens');
  }

  XLSX.writeFile(wb, `relatorio_estoque_${de}_a_${ate}.xlsx`);
}
