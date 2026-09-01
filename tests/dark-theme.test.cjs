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

test('resumo operacional mantém os cinco indicadores na mesma linha', () => {
  assert.match(source, /grid-template-columns: repeat\(5, 1fr\)/);
  assert.match(source, /id="statDone"/);
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

test('dados demo preservam 60 pacientes ativos com 9 conflitos concorrentes dispersos', () => {
  const patients = buildDemoPatientsForTest();
  const activePatients = patients.filter(patient => !patient.isComplete);
  const busyPatients = activePatients.filter(patient => patient.currentLocation);

  assert.equal(patients.length, 72);
  assert.equal(activePatients.length, 60);
  assert.equal(busyPatients.length, 9);
  assert.equal(new Set(patients.map(patient => patient.id)).size, 72);
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

test('os 60 pacientes ativos mantêm proporção decrescente por número de especialidades', () => {
  const patients = buildDemoPatientsForTest().filter(patient => !patient.isComplete);
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

test('os 12 pacientes históricos já chegam com circuitos e tempos concluídos', () => {
  const referenceTime = 1700000000000;
  const completedPatients = buildDemoPatientsForTest().filter(patient => patient.isComplete);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };

  assert.equal(completedPatients.length, 12);
  assert.deepEqual(Array.from(completedPatients, patient => patient.id), [
    'SAS-161', 'SAS-162', 'SAS-163', 'SAS-164', 'SAS-165', 'SAS-166',
    'SAS-167', 'SAS-168', 'SAS-169', 'SAS-170', 'SAS-171', 'SAS-172'
  ]);

  for (const patient of completedPatients) {
    distribution[patient.specialties.length] += 1;
    assert.equal(patient.currentLocation, null);
    assert.ok(patient.completedAt < referenceTime);
    assert.ok(patient.specialties.every(specId => patient.statusBySpec[specId] === 'done'));
    assert.ok(patient.specialties.every(specId => patient.stages[specId].roomEnd < referenceTime));
  }

  assert.deepEqual(distribution, { 1: 6, 2: 3, 3: 2, 4: 1 });
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

function getCompletionSummaryForTest(allPatients) {
  const start = source.indexOf('function isCircuitComplete(');
  const end = source.indexOf('function renderQueues()', start);
  assert.notEqual(start, -1, 'isCircuitComplete deve existir');
  assert.notEqual(end, -1, 'renderQueues deve seguir os helpers de finalização');

  const sandbox = { patients: allPatients };
  vm.runInNewContext(`${source.slice(start, end)}\nresult = {\n  completedInOftalmo: getCompletedPatientsBySpec('oftalmo').map(patient => patient.id),\n  completeCircuit: getCompleteCircuitPatients().map(patient => patient.id),\n  counts: getDashboardCounts()\n};`, sandbox);
  return sandbox.result;
}

test('finalizados ficam rastreáveis por especialidade e por circuito completo', () => {
  const allPatients = [
    { id: 'P-1', specialties: ['oftalmo', 'dermato'], statusBySpec: { oftalmo: 'done', dermato: 'waiting' }, currentLocation: null },
    { id: 'P-2', specialties: ['oftalmo'], statusBySpec: { oftalmo: 'done' }, currentLocation: null, isComplete: true },
    { id: 'P-3', specialties: ['oftalmo'], statusBySpec: { oftalmo: 'waiting' }, currentLocation: null },
    { id: 'P-4', specialties: ['oftalmo'], statusBySpec: { oftalmo: 'in_room' }, currentLocation: { spec: 'oftalmo', stage: 'in_room' } }
  ];

  const summary = getCompletionSummaryForTest(allPatients);
  assert.deepEqual(Array.from(summary.completedInOftalmo), ['P-1', 'P-2']);
  assert.deepEqual(Array.from(summary.completeCircuit), ['P-2']);
  assert.equal(summary.counts.total, 4);
  assert.equal(summary.counts.waiting, 2);
  assert.equal(summary.counts.inRoom, 1);
  assert.equal(summary.counts.done, 1);
});

test('Circuitos Finalizados possui estado recolhível persistido', () => {
  assert.match(source, /completedCircuitsExpanded/);
  assert.match(source, /function toggleCompletedCircuits\(\)/);
  assert.match(source, /completed-circuits-body/);
  assert.match(source, /sas_completed_circuits_expanded/);
});

function runWristbandPaletteForTest() {
  const start = source.indexOf('function normalizeHexColor(');
  const end = source.indexOf('function openColorsModal()', start);
  assert.notEqual(start, -1, 'normalizeHexColor deve existir');
  assert.notEqual(end, -1, 'openColorsModal deve seguir a lógica da paleta');

  const saved = {};
  const sandbox = {
    WRISTBAND_PALETTE: ['#111111', '#222222'],
    SPECIALTIES: [
      { id: 'oftalmo', color: '#111111' },
      { id: 'odonto', color: '#222222' }
    ],
    localStorage: { setItem: (key, value) => { saved[key] = value; } },
    saved
  };
  vm.runInNewContext(`${source.slice(start, end)}\nresult = {\n  added: addWristbandColor('#333333'),\n  edited: updateWristbandColor('#111111', '#444444'),\n  blockedDeletion: deleteWristbandColor('#444444'),\n  reassigned: assignSpecialtyWristbandColor('oftalmo', '#333333'),\n  removed: deleteWristbandColor('#444444'),\n  palette: WRISTBAND_PALETTE,\n  specialties: SPECIALTIES,\n  saved\n};`, sandbox);
  return sandbox.result;
}

test('paleta central permite criar, editar, atribuir e remover cores sem quebrar especialidades', () => {
  const result = runWristbandPaletteForTest();
  assert.equal(result.added, true);
  assert.equal(result.edited, true);
  assert.equal(result.blockedDeletion, false);
  assert.equal(result.reassigned, true);
  assert.equal(result.removed, true);
  assert.deepEqual(Array.from(result.palette), ['#222222', '#333333']);
  assert.equal(result.specialties[0].color, '#333333');
  assert.ok(result.saved.sas_wristband_palette);
  assert.ok(result.saved.sas_volantes_specialties);
});

test('gestor de especialidades cria, edita e protege a disponibilidade diária', () => {
  const start = source.indexOf('function normalizeHexColor(');
  const end = source.indexOf('function openColorsModal()', start);
  assert.notEqual(start, -1, 'lógica de especialidades deve existir');
  assert.notEqual(end, -1, 'openColorsModal deve seguir a lógica de especialidades');

  const saved = {};
  const sandbox = {
    WRISTBAND_PALETTE: ['#111111', '#222222'],
    SPECIALTIES: [{ id: 'oftalmo', name: 'Oftalmologia', icon: '👁️', color: '#111111', active: true }],
    patients: [],
    localStorage: { setItem: (key, value) => { saved[key] = value; } },
    saved,
    result: null
  };
  vm.runInNewContext(`${source.slice(start, end)}
    created = addSpecialty({ name: 'Fonoaudiologia', icon: '👂', color: '#222222' });
    edited = updateSpecialtyDetails(created.id, { name: 'Otorrinolaringologia', icon: '🦻', color: '#111111' });
    patients.push({ specialties: [created.id], statusBySpec: { [created.id]: 'waiting' } });
    blockedAvailability = setSpecialtyAvailability(created.id, false);
    patients[0].statusBySpec[created.id] = 'done';
    disabledAvailability = setSpecialtyAvailability(created.id, false);
    result = { created, edited, blockedAvailability, disabledAvailability, specialties: SPECIALTIES, saved };
  `, sandbox);

  const result = sandbox.result;
  assert.match(result.created.id, /^fonoaudiologia/);
  assert.equal(result.edited, true);
  assert.equal(result.blockedAvailability, false);
  assert.equal(result.disabledAvailability, true);
  assert.equal(result.specialties[1].name, 'Otorrinolaringologia');
  assert.equal(result.specialties[1].icon, '🦻');
  assert.equal(result.specialties[1].color, '#111111');
  assert.equal(result.specialties[1].active, false);
  assert.ok(result.saved.sas_volantes_specialties);
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

test('paleta personalizada persiste sem re-injetar cores padrão excluídas', () => {
  const start = source.indexOf('function normalizeHexColor(');
  const end = source.indexOf('function openColorsModal()', start);
  const sandbox = {
    DEFAULT_WRISTBAND_PALETTE: ['#111111', '#222222', '#333333'],
    SPECIALTIES: [{ id: 'oftalmo', color: '#444444' }],
    localStorage: {
      getItem: (key) => key === 'sas_wristband_palette' ? JSON.stringify(['#444444', '#555555']) : null
    },
    result: null
  };
  vm.runInNewContext(`${source.slice(start, end)}
    result = getInitialWristbandPalette();
  `, sandbox);

  assert.deepEqual(Array.from(sandbox.result), ['#444444', '#555555']);
});

test('exclusão de especialidade protege integridade do histórico', () => {
  const start = source.indexOf('function normalizeHexColor(');
  const end = source.indexOf('function openColorsModal()', start);
  const saved = {};
  const sandbox = {
    WRISTBAND_PALETTE: ['#111111', '#222222'],
    SPECIALTIES: [
      { id: 'oftalmo', name: 'Oftalmologia', icon: '👁️', color: '#111111', active: true },
      { id: 'odonto', name: 'Odontologia', icon: '🦷', color: '#222222', active: true }
    ],
    patients: [{ specialties: ['oftalmo'], statusBySpec: { oftalmo: 'done' } }],
    localStorage: { setItem: (key, value) => { saved[key] = value; } },
    saved,
    result: null
  };
  vm.runInNewContext(`${source.slice(start, end)}
    blockedDelete = deleteSpecialty('oftalmo');
    allowedDelete = deleteSpecialty('odonto');
    result = { blockedDelete, allowedDelete, specialties: SPECIALTIES };
  `, sandbox);

  assert.equal(sandbox.result.blockedDelete, false);
  assert.equal(sandbox.result.allowedDelete, true);
  assert.equal(sandbox.result.specialties.length, 1);
  assert.equal(sandbox.result.specialties[0].id, 'oftalmo');
});

test('painel de circuitos finalizados possui atributos de acessibilidade aria-controls e id', () => {
  assert.match(source, /id="completedCircuitsHeader"/);
  assert.match(source, /aria-controls="completedCircuitsBody"/);
  assert.match(source, /id="completedCircuitsBody"/);
});

function getInterleavedWaitingListForTest(list) {
  const start = source.indexOf('function getInterleavedWaitingList(');
  const end = source.indexOf('function getDashboardCounts()', start);
  assert.notEqual(start, -1, 'getInterleavedWaitingList deve existir');
  assert.notEqual(end, -1, 'getDashboardCounts deve seguir getInterleavedWaitingList');

  const sandbox = { list, result: null };
  vm.runInNewContext(`${source.slice(start, end)}\nresult = getInterleavedWaitingList(list);`, sandbox);
  return sandbox.result;
}

test('intercalação 1:1 na tenda alterna pacientes preferenciais e gerais preservando FIFO de cada grupo', () => {
  const mixedList = [
    { id: 'P-1', name: 'Preferencial 1', isPriority: true },
    { id: 'P-2', name: 'Preferencial 2', isPriority: true },
    { id: 'R-1', name: 'Geral 1', isPriority: false },
    { id: 'R-2', name: 'Geral 2', isPriority: false },
    { id: 'R-3', name: 'Geral 3', isPriority: false },
    { id: 'R-4', name: 'Geral 4', isPriority: false }
  ];

  const interleaved = getInterleavedWaitingListForTest(mixedList);
  assert.deepEqual(
    Array.from(interleaved, p => p.id),
    ['P-1', 'R-1', 'P-2', 'R-2', 'R-3', 'R-4']
  );

  // Lista somente com preferenciais
  const priorityOnly = [
    { id: 'P-1', isPriority: true },
    { id: 'P-2', isPriority: true }
  ];
  assert.deepEqual(
    Array.from(getInterleavedWaitingListForTest(priorityOnly), p => p.id),
    ['P-1', 'P-2']
  );

  // Lista somente com gerais
  const regularOnly = [
    { id: 'R-1', isPriority: false },
    { id: 'R-2', isPriority: false }
  ];
  assert.deepEqual(
    Array.from(getInterleavedWaitingListForTest(regularOnly), p => p.id),
    ['R-1', 'R-2']
  );
});

test('pacientes demo possuem identificação de preferencial e badge visual no markup', () => {
  const patients = buildDemoPatientsForTest();
  const priorityPatients = patients.filter(p => p.isPriority);
  assert.ok(priorityPatients.length >= 10, 'deve haver proporção realista de pacientes preferenciais');
  assert.match(source, /priority-badge/);
  assert.match(source, /⭐ Preferencial/);
  assert.match(source, /priority-queue-badge/);
});

