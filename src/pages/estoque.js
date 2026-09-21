import { ICONS } from '../components/icons.js';
import { state, podeEditar, isAdmin } from '../state.js';
import { escapeHtml, brl, isLowStock } from '../utils.js';
import { renderProductCard } from '../components/product-card.js';
import { openSheet, closeSheet, showToast, confirmar } from '../components/modal.js';
import * as produtosSvc from '../services/produtos.js';
import * as classesSvc from '../services/classes.js';
import * as movSvc from '../services/movimentacoes.js';

export function viewEstoque() {
  const ativos = state.produtos.filter(p => p.status !== 'inativo');
  const unidades = ativos.reduce((s, p) => s + p.quantidade, 0);
  const valorEstoque = ativos.reduce((s, p) => s + p.quantidade * p.valorUnitario, 0);
  const estoqueBaixo = ativos.filter(isLowStock).length;

  let lista = state.produtos.slice();
  if (state.filtroEstoqueView === 'ativos') lista = lista.filter(p => p.status !== 'inativo');
  else if (state.filtroEstoqueView === 'inativos') lista = lista.filter(p => p.status === 'inativo');
  else if (state.filtroEstoqueView === 'baixo') lista = lista.filter(p => p.status !== 'inativo' && isLowStock(p));
  if (state.filtroClasse !== 'todas') lista = lista.filter(p => p.classe === state.filtroClasse);
  const busca = state.buscaProduto.trim().toLowerCase();
  if (busca) lista = lista.filter(p => p.nome.toLowerCase().includes(busca) || (p.codigo || '').toLowerCase().includes(busca));

  const sorters = {
    nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
    qtd_desc: (a, b) => b.quantidade - a.quantidade,
    qtd_asc: (a, b) => a.quantidade - b.quantidade,
    valor_desc: (a, b) => b.valorUnitario - a.valorUnitario,
    valortotal_desc: (a, b) => (b.quantidade * b.valorUnitario) - (a.quantidade * a.valorUnitario),
    classe: (a, b) => a.classe.localeCompare(b.classe, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'),
  };
  lista.sort(sorters[state.ordenacao] || sorters.nome);

  const classeChips = ['todas', ...state.classes.map(c => c.nome)].map(c =>
    `<button class="chip ${state.filtroClasse === c ? 'active' : ''}" data-chip-classe="${escapeHtml(c)}">${c === 'todas' ? 'Todas classes' : escapeHtml(c)}</button>`).join('');
  const viewChips = [['ativos', 'Ativos'], ['baixo', 'Estoque baixo'], ['inativos', 'Inativos'], ['todos', 'Todos']]
    .map(([v, l]) => `<button class="chip ${state.filtroEstoqueView === v ? 'active' : ''}" data-chip-view="${v}">${l}</button>`).join('');

  const cardsHtml = lista.length === 0
    ? `<div class="empty-state">${ICONS.bottle}<p>Nenhum produto encontrado com esse filtro.</p></div>`
    : `<div class="products-grid">${lista.map(renderProductCard).join('')}</div>`;

  return `
    <h2 class="section-title">Estoque</h2>
    <p class="subtle" style="margin:0 0 14px;">Depósito próprio · valores atualizados a cada movimentação</p>
    <div class="stats-grid">
      <div class="card stat-card"><div class="lbl">PRODUTOS CADASTRADOS</div><div class="val">${state.produtos.length}</div></div>
      <div class="card stat-card"><div class="lbl">UNIDADES EM ESTOQUE</div><div class="val">${unidades}</div></div>
      <div class="card stat-card"><div class="lbl">VALOR TOTAL DO ESTOQUE</div><div class="val">${brl(valorEstoque)}</div></div>
      <div class="card stat-card ${estoqueBaixo > 0 ? 'warn' : ''}"><div class="lbl">ESTOQUE BAIXO</div><div class="val">${estoqueBaixo}</div></div>
    </div>
    <div class="searchbar">${ICONS.search}<input id="busca-produto" placeholder="Buscar por nome ou código..." value="${escapeHtml(state.buscaProduto)}"></div>
    <div class="chip-row">${viewChips}</div>
    <div class="chip-row">${classeChips}</div>
    <div class="row" style="margin-bottom:12px;">
      <select id="sel-ordenar" class="grow">
        <option value="nome" ${state.ordenacao === 'nome' ? 'selected' : ''}>Ordenar: Nome (A-Z)</option>
        <option value="qtd_desc" ${state.ordenacao === 'qtd_desc' ? 'selected' : ''}>Ordenar: Quantidade (maior)</option>
        <option value="qtd_asc" ${state.ordenacao === 'qtd_asc' ? 'selected' : ''}>Ordenar: Quantidade (menor)</option>
        <option value="valor_desc" ${state.ordenacao === 'valor_desc' ? 'selected' : ''}>Ordenar: Valor unitário</option>
        <option value="valortotal_desc" ${state.ordenacao === 'valortotal_desc' ? 'selected' : ''}>Ordenar: Valor total</option>
        <option value="classe" ${state.ordenacao === 'classe' ? 'selected' : ''}>Ordenar: Classe</option>
      </select>
    </div>
    <div class="row wrap" style="margin-bottom:16px;">
      ${podeEditar() ? `<button class="btn btn-primary" data-action="novo-produto">${ICONS.plus} Novo produto</button>` : ''}
      ${isAdmin() ? `<button class="btn btn-ghost" data-action="gerenciar-classes">${ICONS.tags} Classes</button>` : ''}
    </div>
    ${cardsHtml}
  `;
}

export function bindEstoque(reRender) {
  const busca = document.getElementById('busca-produto');
  if (busca) busca.addEventListener('input', e => { state.buscaProduto = e.target.value; reRender(); });
  const ord = document.getElementById('sel-ordenar');
  if (ord) ord.addEventListener('change', e => { state.ordenacao = e.target.value; reRender(); });
  document.querySelectorAll('[data-chip-view]').forEach(c => c.addEventListener('click', () => { state.filtroEstoqueView = c.dataset.chipView; reRender(); }));
  document.querySelectorAll('[data-chip-classe]').forEach(c => c.addEventListener('click', () => { state.filtroClasse = c.dataset.chipClasse; reRender(); }));
  document.querySelectorAll('[data-action="novo-produto"]').forEach(b => b.addEventListener('click', () => openProdutoModal(null, reRender)));
  document.querySelectorAll('[data-action="gerenciar-classes"]').forEach(b => b.addEventListener('click', () => openClassesModal(reRender)));
  document.querySelectorAll('[data-action="edit-produto"]').forEach(b => b.addEventListener('click', () => openProdutoModal(state.produtos.find(x => x.id === b.dataset.id), reRender)));
  document.querySelectorAll('[data-action="ajustar-produto"]').forEach(b => b.addEventListener('click', () => openAjusteModal(state.produtos.find(x => x.id === b.dataset.id), reRender)));
  document.querySelectorAll('[data-action="del-produto"]').forEach(b => b.addEventListener('click', async () => {
    if (!confirmar('Excluir este produto? Se ele já tiver movimentações, o sistema vai apenas desativá-lo (o histórico nunca é apagado).')) return;
    try {
      const resultado = await produtosSvc.excluirOuDesativarProduto(b.dataset.id);
      await recarregarProdutos();
      reRender();
      showToast(resultado === 'desativado' ? 'Produto tinha histórico — foi desativado.' : 'Produto excluído.');
    } catch (e) { showToast(e.message); }
  }));
}

async function recarregarProdutos() {
  state.produtos = await produtosSvc.listarProdutos();
}

function openProdutoModal(produto, reRender) {
  const editando = !!produto;
  const p = produto || { id: '', nome: '', classeId: state.classes[0]?.id || '', codigo: '', valorUnitario: '', quantidade: 0, estoqueMinimo: 50, status: 'ativo', imagemUrl: '' };
  const codigoSugerido = p.codigo || ('VN-' + String(state.produtos.length + 1).padStart(4, '0'));
  const classeOpts = state.classes.map(c => `<option value="${c.id}" ${c.id === p.classeId ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('');

  openSheet(editando ? 'Editar produto' : 'Novo produto', `
    <div class="img-upload-row">
      <div class="img-preview" id="img-preview">${p.imagemUrl ? `<img src="${p.imagemUrl}">` : ICONS.bottle}</div>
      <div>
        <label class="filepick">Adicionar foto (opcional)<input type="file" id="input-imagem" accept="image/png,image/jpeg,image/webp"></label>
        <div class="subtle" style="margin-top:4px;">JPG, PNG ou WEBP · enviada para o Storage</div>
      </div>
    </div>
    <div class="field"><label class="field-label">Nome do produto</label><input id="f-nome" value="${escapeHtml(p.nome)}" placeholder="Ex.: CM Merlot"></div>
    <div class="field"><label class="field-label">Classe</label><select id="f-classe">${classeOpts}</select></div>
    <div class="row">
      <div class="field grow"><label class="field-label">Código interno</label><input id="f-codigo" value="${escapeHtml(codigoSugerido)}"></div>
      <div class="field grow"><label class="field-label">Status</label><select id="f-status"><option value="ativo" ${p.status === 'ativo' ? 'selected' : ''}>Ativo</option><option value="inativo" ${p.status === 'inativo' ? 'selected' : ''}>Inativo</option></select></div>
    </div>
    <div class="row">
      <div class="field grow"><label class="field-label">Valor unitário (R$)</label><input id="f-valor" type="number" step="0.01" min="0" value="${p.valorUnitario}"></div>
      <div class="field grow"><label class="field-label">${editando ? 'Quantidade em estoque (fixo)' : 'Quantidade inicial'}</label><input id="f-qtd" type="number" step="1" min="0" value="${p.quantidade}" ${editando ? 'disabled' : ''}></div>
    </div>
    ${editando ? `<p class="subtle" style="margin-top:-8px;">Para mudar a quantidade, use "Ajustar estoque", Entrada ou Saída — assim fica tudo no histórico.</p>` : ''}
    <div class="field"><label class="field-label">Alertar quando estoque for menor que</label><input id="f-min" type="number" step="1" value="${p.estoqueMinimo}"></div>
    <div class="row" style="margin-top:6px;">
      ${editando && isAdmin() ? `<button class="btn btn-danger" id="btn-del">${ICONS.trash} Excluir</button>` : ''}
      <button class="btn btn-ghost grow" id="btn-cancel">Cancelar</button>
      <button class="btn btn-primary grow" id="btn-save">Salvar</button>
    </div>
  `, (root) => {
    let novoArquivo = null;
    root.querySelector('#input-imagem').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      novoArquivo = file;
      const reader = new FileReader();
      reader.onload = () => { root.querySelector('#img-preview').innerHTML = `<img src="${reader.result}">`; };
      reader.readAsDataURL(file);
    });
    root.querySelector('#btn-cancel').addEventListener('click', closeSheet);
    if (editando && isAdmin()) {
      root.querySelector('#btn-del').addEventListener('click', async () => {
        if (!confirmar('Excluir este produto? Se já tiver movimentações, será apenas desativado.')) return;
        try {
          const resultado = await produtosSvc.excluirOuDesativarProduto(p.id);
          await recarregarProdutos();
          closeSheet(); reRender();
          showToast(resultado === 'desativado' ? 'Produto desativado (já tinha histórico).' : 'Produto excluído.');
        } catch (e) { showToast(e.message); }
      });
    }
    root.querySelector('#btn-save').addEventListener('click', async () => {
      const nome = root.querySelector('#f-nome').value.trim();
      if (!nome) { showToast('Dê um nome ao produto.'); return; }
      const dados = {
        nome, classeId: root.querySelector('#f-classe').value,
        codigo: root.querySelector('#f-codigo').value.trim() || codigoSugerido,
        status: root.querySelector('#f-status').value,
        valorUnitario: parseFloat(root.querySelector('#f-valor').value) || 0,
        estoqueMinimo: parseInt(root.querySelector('#f-min').value) || 50,
        imagemFile: novoArquivo,
      };
      try {
        if (editando) {
          await produtosSvc.atualizarProduto(p.id, { ...dados, imagemUrlAtual: p.imagemUrl });
        } else {
          await produtosSvc.criarProduto({ ...dados, quantidade: parseInt(root.querySelector('#f-qtd').value) || 0 });
        }
        await recarregarProdutos();
        closeSheet(); reRender();
        showToast(editando ? 'Produto atualizado.' : 'Produto adicionado.');
      } catch (e) { showToast(e.message); }
    });
  });
}

function openAjusteModal(produto, reRender) {
  openSheet('Ajustar estoque', `
    <p class="subtle" style="margin:-4px 0 12px;">${escapeHtml(produto.nome)} — estoque atual do sistema: <strong>${produto.quantidade}</strong></p>
    <div class="field"><label class="field-label">Estoque físico contado agora</label><input id="aj-fisico" type="number" inputmode="numeric" step="1" value="${produto.quantidade}"></div>
    <div class="field"><label class="field-label">Motivo do ajuste</label><input id="aj-motivo" placeholder="Ex.: garrafa quebrada..."></div>
    <div class="row" style="margin-top:6px;">
      <button class="btn btn-ghost grow" id="btn-cancel">Cancelar</button>
      <button class="btn btn-primary grow" id="btn-save">Confirmar ajuste</button>
    </div>
  `, (root) => {
    root.querySelector('#btn-cancel').addEventListener('click', closeSheet);
    root.querySelector('#btn-save').addEventListener('click', async () => {
      const novo = parseInt(root.querySelector('#aj-fisico').value);
      if (isNaN(novo) || novo < 0) { showToast('Informe um número válido.'); return; }
      try {
        await movSvc.ajustarEstoqueManual(produto.id, novo, root.querySelector('#aj-motivo').value.trim());
        await recarregarProdutos();
        closeSheet(); reRender();
        showToast(`Estoque de ${produto.nome} ajustado para ${novo}.`);
      } catch (e) { showToast(e.message); }
    });
  });
}

function openClassesModal(reRender) {
  render();
  function render() {
    closeSheet();
    openSheet('Classes de vinho', `
      <div class="field">
        ${state.classes.map(c => `<div class="manage-list-row"><span>${escapeHtml(c.nome)}</span><button class="icon-btn danger" data-del-classe="${c.id}">${ICONS.x}</button></div>`).join('')}
        <div class="row" style="margin-top:8px;">
          <input id="nova-classe" placeholder="Nova classe (ex.: Fortificado)" class="grow">
          <button class="btn btn-ghost" id="btn-add-classe">${ICONS.plus}</button>
        </div>
      </div>
      <button class="btn btn-primary" id="btn-fechar" style="margin-top:8px;">Concluir</button>
    `, (root) => {
      root.querySelector('#btn-fechar').addEventListener('click', () => { closeSheet(); reRender(); });
      root.querySelector('#btn-add-classe').addEventListener('click', async () => {
        const v = root.querySelector('#nova-classe').value.trim();
        if (!v) return;
        try {
          await classesSvc.criarClasse(v);
          state.classes = await classesSvc.listarClasses();
          render();
        } catch (e) { showToast(e.message); }
      });
      root.querySelectorAll('[data-del-classe]').forEach(b => b.addEventListener('click', async () => {
        try {
          await classesSvc.excluirClasse(b.dataset.delClasse);
          state.classes = await classesSvc.listarClasses();
          render();
        } catch (e) { showToast(e.message); }
      }));
    });
  }
}
