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

test('tema escuro usa superfícies em grafite neutro', () => {
  const automatic = blockAfter('@media (prefers-color-scheme: dark)');
  const explicit = blockAfter(':root[data-theme="dark"]');

  for (const block of [automatic, explicit]) {
    assert.match(block, /--bg-app: #0B0B0C/);
    assert.match(block, /--bg-card: #121214/);
  }
});

test('UI de volantes possui visão geral minimizável por linha', () => {
  assert.match(source, /class="specialty-row-card/);
  assert.match(source, /toggleExpandSpecialty/);
  assert.match(source, /toggleSpecialtyFilter/);
});

test('temporizador apresenta acionamentos e a próxima ação clara', () => {
  assert.match(source, /handleTimerButtonClick/);
  assert.match(source, /class="timer-next-action"/);
});

test('volantes não cadastram pacientes no aplicativo', () => {
  assert.doesNotMatch(source, /Novo paciente/);
  assert.doesNotMatch(source, /id="addPatientModal"/);
  assert.doesNotMatch(source, /function openAddModal\(\)/);
  assert.doesNotMatch(source, /function saveNewPatient\(\)/);
  assert.match(source, /Cadastros são realizados na Planilha Master/);
});
