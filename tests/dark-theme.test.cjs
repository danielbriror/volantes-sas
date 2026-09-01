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

test('dados demo simulam 60 pacientes com 9 conflitos concorrentes dispersos', () => {
  const patients = buildDemoPatientsForTest();
  const busyPatients = patients.filter(patient => patient.currentLocation);

  assert.equal(patients.length, 60);
  assert.equal(busyPatients.length, 9);
  assert.equal(new Set(patients.map(patient => patient.id)).size, 60);
  assert.deepEqual(Array.from(busyPatients, patient => patient.id), [
    'SAS-102', 'SAS-109', 'SAS-115', 'SAS-124', 'SAS-131',
    'SAS-138', 'SAS-144', 'SAS-149', 'SAS-160'
  ]);

  for (const patient of busyPatients) {
    assert.ok(patient.specialties.length >= 2);
    assert.equal(patient.statusBySpec[patient.currentLocation.spec], patient.currentLocation.stage);
    assert.ok(patient.specialties.some(spec => spec !== patient.currentLocation.spec && patient.statusBySpec[spec] === 'waiting'));
  }
});

test('dados demo reduzem a proporção conforme cresce o número de especialidades', () => {
  const patients = buildDemoPatientsForTest();
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const patient of patients) {
    distribution[patient.specialties.length] += 1;
    assert.equal(new Set(patient.specialties).size, patient.specialties.length);
  }

  assert.deepEqual(distribution, { 1: 30, 2: 18, 3: 9, 4: 3 });
  assert.ok(distribution[1] > distribution[2]);
  assert.ok(distribution[2] > distribution[3]);
  assert.ok(distribution[3] > distribution[4]);
});

function getPostConsultationPlanForTest(patient, allPatients, specialties) {
  const start = source.indexOf('function getPostConsultationPlan(');
  const end = source.indexOf('function openPostConsultationModal(', start);
  assert.notEqual(start, -1, 'getPostConsultationPlan deve existir');
  assert.notEqual(end, -1, 'openPostConsultationModal deve seguir getPostConsultationPlan');

  const sandbox = { patients: allPatients, SPECIALTIES: specialties, patient };
  vm.runInNewContext(`${source.slice(start, end)}\nresult = getPostConsultationPlan(patient);`, sandbox);
  return sandbox.result;
}

test('encerramento da consulta libera paciente sem especialidades pendentes', () => {
  const specialties = [{ id: 'oftalmo', name: 'Oftalmologia' }];
  const patient = { id: 'P-1', specialties: ['oftalmo'], statusBySpec: { oftalmo: 'in_room' } };

  const plan = getPostConsultationPlanForTest(patient, [patient], specialties);
  assert.equal(plan.kind, 'complete');
  assert.deepEqual(Array.from(plan.pendingSpecs), []);
});

test('encerramento sugere porta direta apenas sem outro paciente aguardando', () => {
  const specialties = [
    { id: 'oftalmo', name: 'Oftalmologia' },
    { id: 'dermato', name: 'Dermatologia' }
  ];
  const patient = {
    id: 'P-2',
    specialties: ['oftalmo', 'dermato'],
    statusBySpec: { oftalmo: 'in_room', dermato: 'waiting' }
  };
  const planWithoutQueue = getPostConsultationPlanForTest(patient, [patient], specialties);
  assert.equal(planWithoutQueue.kind, 'pending');
  assert.deepEqual(Array.from(planWithoutQueue.directDoorSpecs), ['dermato']);
  assert.deepEqual(Array.from(planWithoutQueue.returnToWaitingSpecs), []);

  const anotherWaitingPatient = {
    id: 'P-3', specialties: ['dermato'], statusBySpec: { dermato: 'waiting' }
  };
  const planWithQueue = getPostConsultationPlanForTest(patient, [patient, anotherWaitingPatient], specialties);
  assert.deepEqual(Array.from(planWithQueue.directDoorSpecs), []);
  assert.deepEqual(Array.from(planWithQueue.returnToWaitingSpecs), ['dermato']);
});

test('confirmação de porta direta conclui a consulta e move apenas o próximo destino escolhido', () => {
  const start = source.indexOf('function confirmPostConsultation(');
  const end = source.indexOf('function finishConsultation(', start);
  assert.notEqual(start, -1, 'confirmPostConsultation deve existir');
  assert.notEqual(end, -1, 'finishConsultation deve seguir confirmPostConsultation');

  const patient = {
    id: 'P-4', specialties: ['oftalmo', 'dermato'],
    statusBySpec: { oftalmo: 'in_room', dermato: 'waiting' },
    currentLocation: { spec: 'oftalmo', stage: 'in_room' }, stages: { oftalmo: {}, dermato: {} }
  };
  const remoteActions = [];
  const sandbox = {
    patients: [patient],
    Date: { now: () => 1700000000000 },
    saveState: () => { sandbox.saved = (sandbox.saved || 0) + 1; },
    closeModal: id => { sandbox.closedModal = id; },
    pushRemoteAction: (...args) => remoteActions.push(args),
    vibrate: () => { sandbox.vibrated = true; }
  };
  vm.runInNewContext(`${source.slice(start, end)}\nconfirmPostConsultation('P-4', 'oftalmo', 'dermato');`, sandbox);

  assert.equal(patient.statusBySpec.oftalmo, 'done');
  assert.equal(patient.statusBySpec.dermato, 'door');
  assert.deepEqual({ ...patient.currentLocation }, { spec: 'dermato', stage: 'door' });
  assert.equal(sandbox.saved, 1);
  assert.equal(sandbox.closedModal, 'postConsultationModal');
  assert.deepEqual(remoteActions, [['P-4', 'oftalmo', 'done'], ['P-4', 'dermato', 'door']]);
});

test('sincronização não confirma sucesso quando o POST remoto falha', () => {
  const start = source.indexOf('async function pushRemoteAction');
  const end = source.indexOf('function saveApiUrl()', start);
  assert.notEqual(start, -1, 'pushRemoteAction deve existir');
  assert.notEqual(end, -1, 'saveApiUrl deve seguir pushRemoteAction');

  const postBlock = source.slice(start, end);
  assert.match(postBlock, /const res = await fetch\(sasApiUrl/);
  assert.match(postBlock, /if \(!res\.ok\) throw new Error\('HTTP ' \+ res\.status\);/);
});
