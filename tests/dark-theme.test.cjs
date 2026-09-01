const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../index.html'), 'utf8');

function blockAfter(marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${marker}`);
  const next = source.indexOf('    }', start);
  return source.slice(start, next + 5);
}

test('tema escuro usa superfícies premium em grafite neutro', () => {
  const automatic = blockAfter('@media (prefers-color-scheme: dark)');
  const explicit = blockAfter(':root[data-theme="dark"]');

  for (const block of [automatic, explicit]) {
    assert.match(block, /--bg-app: #0B0B0C/);
    assert.match(block, /--bg-card: #121214/);
    assert.match(block, /--bg-card-sub: #18181B/);
    assert.match(block, /--bg-header: linear-gradient\(135deg, #101011 0%, #1A1A1C 100%\)/);
    assert.doesNotMatch(block, /#0A0F1D|#131E34|#1A2846|#0E1A33|#060A14|#0F172A|#111111|#1A1A1A|#202020/);
  }
});

test('console operacional aplica passe visual premium neutro', () => {
  assert.match(source, /--design-system: sas-premium-neutral/);
  assert.match(source, /\/\* Premium console overrides \*\//);
});

test('UI operacional abre com visão geral expansível e seleção múltipla', () => {
  assert.doesNotMatch(source, /class="operational-brief"/);
  assert.doesNotMatch(source, /id="priorityList"/);
  assert.doesNotMatch(source, /function renderOperationalBrief\(\)/);
  assert.match(source, /class="queue-toolbar"/);
  assert.match(source, /class="specialty-overview-list"/);
  assert.match(source, /specialty-overview-row/);
  assert.match(source, /function toggleOverviewSpecialty\(specId\)/);
  assert.match(source, /let selectedSpecialtyFilters/);
  assert.match(source, /function toggleSpecialtyFilter\(specId\)/);
  assert.match(source, /Novo paciente/);
});

test('restaura a aba, filtros e expansões da sessão local', () => {
  assert.match(source, /sas_volantes_ui_state/);
  assert.match(source, /function saveUiState\(\)/);
  assert.match(source, /function restoreUiState\(\)/);
  assert.match(source, /expandedOverviewSpecialties/);
});

test('ações de demonstração e limpeza não ficam na barra operacional', () => {
  assert.match(source, /function loadDemoData\(confirmReplace = false\)/);
  assert.match(source, /confirm\('Substituir os dados locais atuais pelos dados de demonstração\?'/);
  assert.match(source, /confirm\('Limpar todos os pacientes armazenados neste aparelho\?'/);
  assert.doesNotMatch(source, /id="volantesBottomBar"[\s\S]{0,700}>[\s\S]{0,700}Demo/);
});

test('temporizador apresenta a próxima ação antes do toque', () => {
  assert.match(source, /class="timer-next-action"/);
  assert.match(source, /Próxima ação:/);
});
