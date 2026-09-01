const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

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

function buildDemoPatientsForTest() {
  const start = source.indexOf('const DEMO_PATIENT_NAMES =');
  const end = source.indexOf('function saveState()', start);
  assert.notEqual(start, -1, 'a lista de nomes demo deve existir');
  assert.notEqual(end, -1, 'o bloco de dados demo deve terminar antes de saveState');

  const demoBlock = source.slice(start, end);
  const sandbox = {};
  vm.runInNewContext(`${demoBlock}\nresult = buildDemoPatients(1700000000000);`, sandbox);
  return sandbox.result;
}

test('dados demo simulam 60 pacientes com 9 conflitos concorrentes', () => {
  const patients = buildDemoPatientsForTest();
  const busyPatients = patients.filter(patient => patient.currentLocation);

  assert.equal(patients.length, 60);
  assert.equal(busyPatients.length, 9);
  assert.equal(new Set(patients.map(patient => patient.id)).size, 60);

  for (const patient of busyPatients) {
    assert.equal(patient.specialties.length, 2);
    assert.equal(patient.statusBySpec[patient.currentLocation.spec], patient.currentLocation.stage);
    assert.ok(patient.specialties.some(spec => spec !== patient.currentLocation.spec && patient.statusBySpec[spec] === 'waiting'));
  }
});

test('dados demo distribuem 20 pacientes em cada especialidade', () => {
  const patients = buildDemoPatientsForTest();
  const distribution = Object.fromEntries(['oftalmo', 'odonto', 'dermato', 'gineco', 'pediatria', 'clinica'].map(id => [id, 0]));

  for (const patient of patients) {
    for (const specialty of patient.specialties) distribution[specialty] += 1;
  }

  assert.deepEqual(distribution, {
    oftalmo: 20,
    odonto: 20,
    dermato: 20,
    gineco: 20,
    pediatria: 20,
    clinica: 20
  });
});
