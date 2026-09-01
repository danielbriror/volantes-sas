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

test('tema escuro usa superfícies neutras em cinza/preto', () => {
  const automatic = blockAfter('@media (prefers-color-scheme: dark)');
  const explicit = blockAfter(':root[data-theme="dark"]');

  for (const block of [automatic, explicit]) {
    assert.match(block, /--bg-app: #111111/);
    assert.match(block, /--bg-card: #1A1A1A/);
    assert.match(block, /--bg-card-sub: #202020/);
    assert.match(block, /--bg-header: linear-gradient\(135deg, #101010 0%, #242424 100%\)/);
    assert.doesNotMatch(block, /#0A0F1D|#131E34|#1A2846|#0E1A33|#060A14|#0F172A/);
  }
});
