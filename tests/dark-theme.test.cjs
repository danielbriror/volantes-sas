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
    assert.match(block, /--bg-app/);
    assert.match(block, /--bg-card/);
    assert.match(block, /--bg-card-sub/);
  }
});

test('UI de volantes e filas limpa sem bloco de prioridades redundante', () => {
  assert.doesNotMatch(source, /class="operational-brief"/);
  assert.doesNotMatch(source, /id="priorityList"/);
});

test('temporizador apresenta acionamentos claros', () => {
  assert.match(source, /handleTimerButtonClick/);
});
