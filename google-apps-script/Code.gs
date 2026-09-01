/**
 * SAS Brasil • Ponte Apps Script entre a Planilha Master (cadastro/triagem,
 * somente leitura) e a Planilha Fila Operacional (onde o app lê e escreve
 * as movimentações de fila: tenda / porta / consulta / concluído).
 *
 * Este script deve ser vinculado (container-bound) à planilha
 * "SAS Brasil • Fila Operacional" — nunca à Planilha Master.
 * A Master é sempre aberta por ID e só é lida, nunca escrita.
 *
 * Setup:
 *   1. Na Fila Operacional: Extensões > Apps Script, cole este arquivo.
 *   2. Preencha MASTER_SHEET_ID abaixo com o ID da Planilha Master real.
 *   3. Rode `setupTrigger` uma vez (menu Executar) para autorizar o script
 *      e criar o gatilho automático de sincronização.
 *   4. Implantar > Nova implantação > Aplicativo da Web
 *      (Executar como: Eu; Quem pode acessar: Qualquer pessoa) e copie a
 *      URL gerada — é ela que vai no app (Configurações > Integração).
 */

const MASTER_SHEET_ID = 'COLOQUE_AQUI_O_ID_DA_PLANILHA_MASTER'; // nunca escrita, só lida
const OPERATIONAL_SHEET_NAME = 'Página1'; // não usado mais — mantido só de referência

const COLUMNS = [
  'ID_Pulseira', 'Nome_Paciente', 'Especialidade_ID', 'Especialidade_Nome',
  'Status', 'Entrou_Tenda', 'Entrou_Porta', 'Entrou_Consulta', 'Concluido_Em', 'Atualizado_Em'
];

// Mesmos ids usados em SPECIALTIES no index.html — mantém os dois lados em sincronia.
const SPECIALTY_MAP = [
  { id: 'oftalmo', match: 'oftalmologia', name: 'Oftalmologia (Ver Magia)' },
  { id: 'odonto', match: 'odontologia', name: 'Odontologia' },
  { id: 'dermato', match: 'dermatologia', name: 'Dermatologia' },
  { id: 'gineco', match: 'saúde da mulher', name: 'Saúde da Mulher (Colo Útero)' },
  { id: 'pediatria', match: 'pediatria', name: 'Pediatria / Neuroped' },
  { id: 'clinica', match: 'clínica geral', name: 'Clínica Geral' },
];

function matchSpecialty_(rawName) {
  const normalized = rawName.trim().toLowerCase();
  return SPECIALTY_MAP.find(s => normalized.includes(s.match)) || null;
}

function getOperationalSheet_() {
  // Pega a primeira aba da planilha ativa — evita depender do nome exato da
  // aba (varia por idioma/edição: "Página1", "Sheet1" etc).
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function readOperationalRows_() {
  const sheet = getOperationalSheet_();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1); // pula cabeçalho
  return rows.map((r, i) => {
    const obj = {};
    COLUMNS.forEach((c, idx) => obj[c] = r[idx]);
    obj._row = i + 2; // linha real na planilha (1-based + cabeçalho)
    return obj;
  });
}

/**
 * Lê a Planilha Master (somente leitura) e adiciona na Fila Operacional
 * qualquer combinação paciente+especialidade que ainda não exista por lá.
 * NUNCA escreve na Master. NUNCA sobrescreve status já em andamento na
 * Fila Operacional — só insere o que é novo.
 */
function syncFromMaster() {
  const master = SpreadsheetApp.openById(MASTER_SHEET_ID).getSheets()[0];
  const masterRows = master.getDataRange().getValues().slice(1); // pula cabeçalho
  // Master: ID_Pulseira, Nome_Paciente, Especialidades_Elegiveis, Horario_Triagem, Status_Geral, Observacoes_Clinicas
  const existing = readOperationalRows_();
  const existingKeys = new Set(existing.map(r => `${r.ID_Pulseira}::${r.Especialidade_ID}`));

  const sheet = getOperationalSheet_();
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  const newRows = [];

  masterRows.forEach(row => {
    const [idPulseira, nomePaciente, especialidadesRaw, horarioTriagem] = row;
    if (!idPulseira) return;

    String(especialidadesRaw).split(',').forEach(rawName => {
      const spec = matchSpecialty_(rawName);
      if (!spec) return; // nome não reconhecido — ver README sobre padronizar a Master

      const key = `${idPulseira}::${spec.id}`;
      if (existingKeys.has(key)) return; // já existe, não mexe (preserva progresso da fila)

      newRows.push([
        idPulseira, nomePaciente, spec.id, spec.name,
        'waiting', horarioTriagem || now, '', '', '', now
      ]);
      existingKeys.add(key);
    });
  });

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, COLUMNS.length).setValues(newRows);
  }
  return newRows.length;
}

/** GET → devolve o estado atual completo da fila, em JSON. */
function doGet(e) {
  const rows = readOperationalRows_().map(r => {
    delete r._row;
    return r;
  });
  return ContentService.createTextOutput(JSON.stringify({ patients: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST → atualiza o status de UM paciente+especialidade.
 * Body esperado (JSON): { idPulseira, especialidadeId, action }
 * action: 'door' | 'in_room' | 'done' | 'waiting' (mesmo vocabulário do app)
 */
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const { idPulseira, especialidadeId, action } = body;

  const sheet = getOperationalSheet_();
  const rows = readOperationalRows_();
  const target = rows.find(r => r.ID_Pulseira === idPulseira && r.Especialidade_ID === especialidadeId);

  if (!target) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Paciente/especialidade não encontrado' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  const colIndex = { Status: 5, Entrou_Porta: 7, Entrou_Consulta: 8, Concluido_Em: 9, Atualizado_Em: 10 };

  sheet.getRange(target._row, colIndex.Status).setValue(action);
  sheet.getRange(target._row, colIndex.Atualizado_Em).setValue(now);
  if (action === 'door') sheet.getRange(target._row, colIndex.Entrou_Porta).setValue(now);
  if (action === 'in_room') sheet.getRange(target._row, colIndex.Entrou_Consulta).setValue(now);
  if (action === 'done') sheet.getRange(target._row, colIndex.Concluido_Em).setValue(now);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Roda uma vez manualmente: autoriza o script e liga a sincronização automática. */
function setupTrigger() {
  ScriptTriggers: {
    ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === 'syncFromMaster')
      .forEach(t => ScriptApp.deleteTrigger(t));
  }
  ScriptApp.newTrigger('syncFromMaster')
    .timeBased()
    .everyMinutes(5)
    .create();
  syncFromMaster(); // primeira sincronização imediata
}
