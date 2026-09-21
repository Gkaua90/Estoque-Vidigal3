import { supabase } from './database.js';

const BUCKET = 'product-images';

export async function listarProdutos() {
  const { data, error } = await supabase
    .from('products')
    .select('*, classes(nome)')
    .order('nome');
  if (error) throw error;
  return data.map(mapProduto);
}

function mapProduto(row) {
  return {
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
    classeId: row.classe_id,
    classe: row.classes ? row.classes.nome : '—',
    valorUnitario: Number(row.valor_unitario),
    quantidade: row.quantidade,
    estoqueMinimo: row.estoque_minimo,
    status: row.status,
    imagemUrl: row.imagem_url,
  };
}

export async function criarProduto({ nome, classeId, codigo, valorUnitario, quantidade, estoqueMinimo, status, imagemFile }) {
  let imagemUrl = null;
  if (imagemFile) imagemUrl = await enviarFoto(imagemFile);
  const { data, error } = await supabase
    .from('products')
    .insert({
      nome, classe_id: classeId, codigo, valor_unitario: valorUnitario,
      quantidade, estoque_minimo: estoqueMinimo, status, imagem_url: imagemUrl,
    })
    .select('*, classes(nome)')
    .single();
  if (error) throw new Error(error.code === '23505' ? 'Já existe um produto com esse código.' : error.message);
  return mapProduto(data);
}

export async function atualizarProduto(id, { nome, classeId, codigo, valorUnitario, estoqueMinimo, status, imagemFile, imagemUrlAtual }) {
  let imagemUrl = imagemUrlAtual;
  if (imagemFile) {
    imagemUrl = await enviarFoto(imagemFile);
    if (imagemUrlAtual) await removerFotoAntiga(imagemUrlAtual);
  }
  // OBS: "quantidade" propositalmente não é editável por aqui — ela só
  // muda através de entrada/saída/ajuste/contagem (ver services/movimentacoes.js
  // e services/contagens.js), que passam pelas funções RPC transacionais.
  // Uma trigger no banco (prevent_direct_quantity_change) bloqueia qualquer
  // tentativa de mudar a quantidade fora desse caminho.
  const { data, error } = await supabase
    .from('products')
    .update({ nome, classe_id: classeId, codigo, valor_unitario: valorUnitario, estoque_minimo: estoqueMinimo, status, imagem_url: imagemUrl })
    .eq('id', id)
    .select('*, classes(nome)')
    .single();
  if (error) throw new Error(error.code === '23505' ? 'Já existe um produto com esse código.' : error.message);
  return mapProduto(data);
}

export async function excluirOuDesativarProduto(id) {
  const { count, error: errCount } = await supabase
    .from('stock_movements')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);
  if (errCount) throw errCount;

  if (count && count > 0) {
    // já tem histórico — nunca apaga fisicamente, só desativa
    const { error } = await supabase.from('products').update({ status: 'inativo' }).eq('id', id);
    if (error) throw error;
    return 'desativado';
  }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  return 'excluido';
}

async function enviarFoto(file) {
  const blob = await redimensionarImagem(file, 500, 0.75);
  const nomeArquivo = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error('Falha ao enviar a foto: ' + error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

async function removerFotoAntiga(url) {
  try {
    const nomeArquivo = url.split(`${BUCKET}/`).pop();
    if (nomeArquivo) await supabase.storage.from(BUCKET).remove([nomeArquivo]);
  } catch (e) {
    console.warn('Não foi possível remover a foto antiga:', e);
  }
}

function redimensionarImagem(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
