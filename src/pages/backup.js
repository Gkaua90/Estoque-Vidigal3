import { ICONS } from '../components/icons.js';
import { openSheet, closeSheet, showToast, confirmar } from '../components/modal.js';
import { exportarBackupCompleto, importarBackupAntigo } from '../services/backup.js';

export function openBackupSheet(recarregarTudo) {
  openSheet('Backup / importar dados antigos', `
    <div class="sheet-list">
      <button id="btn-exportar">${ICONS.download} Exportar backup completo (JSON)</button>
    </div>
    <p class="subtle" style="margin:14px 0 6px;">Importar backup do sistema antigo (o arquivo .html único que usava armazenamento local). Use isso só UMA VEZ, logo depois de configurar o banco novo.</p>
    <div class="field"><input type="file" id="input-backup" accept="application/json"></div>
    <div id="import-log" class="subtle" style="max-height:140px;overflow-y:auto;margin-top:8px;"></div>
    <button class="btn btn-primary" id="btn-importar" style="margin-top:10px;">${ICONS.upload} Importar arquivo selecionado</button>
  `, (root) => {
    root.querySelector('#btn-exportar').addEventListener('click', async () => {
      try { await exportarBackupCompleto(); showToast('Backup exportado.'); }
      catch (e) { showToast('Erro ao exportar: ' + e.message); }
    });
    root.querySelector('#btn-importar').addEventListener('click', async () => {
      const file = root.querySelector('#input-backup').files[0];
      if (!file) { showToast('Selecione um arquivo primeiro.'); return; }
      if (!confirmar('Importar este backup agora? Rode isso só uma vez para não duplicar dados.')) return;
      const logEl = root.querySelector('#import-log');
      try {
        const texto = await file.text();
        const json = JSON.parse(texto);
        await importarBackupAntigo(json, { onProgresso: (msg) => { logEl.innerHTML += `<div>${msg}</div>`; logEl.scrollTop = logEl.scrollHeight; } });
        showToast('Importação concluída.');
        closeSheet();
        await recarregarTudo();
      } catch (e) {
        logEl.innerHTML += `<div style="color:var(--danger);">Erro: ${e.message}</div>`;
      }
    });
  });
}
