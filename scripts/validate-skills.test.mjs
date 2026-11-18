import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const validator = fileURLToPath(new URL('./validate-skills.mjs', import.meta.url));

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'skills-validation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return spawnSync(process.execPath, [validator, root], { encoding: 'utf8' });
}

const valid = '---\nname: sample\ndescription: >-\n  Use AGNT5: create and run a project.\n---\n# Sample\n';

test('accepts a folded description containing a colon', t => {
  const result = fixture(t, { 'sample/SKILL.md': valid });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Valid: sample\/SKILL\.md/);
});

test('rejects the unquoted colon that prevents installer discovery', t => {
  const result = fixture(t, {
    'sample/SKILL.md': '---\nname: sample\ndescription: Use AGNT5: create a project.\n---\n',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /sample\/SKILL\.md:/);
  assert.match(result.stderr, /Nested mappings/);
});

test('validates every skill, including a malformed nested addition', t => {
  const result = fixture(t, {
    'sample/SKILL.md': valid,
    'more/nested/SKILL.md': '---\nname: nested\ndescription: [unfinished\n---\n',
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Valid: sample\/SKILL\.md/);
  assert.match(result.stderr, /more\/nested\/SKILL\.md:/);
});

for (const [label, frontmatter] of [
  ['missing name', 'description: Example'],
  ['missing description', 'name: sample'],
  ['empty name', 'name: ""\ndescription: Example'],
  ['blank description', 'name: sample\ndescription: "   "'],
  ['numeric name', 'name: 123\ndescription: Example'],
  ['list description', 'name: sample\ndescription: [Example]'],
]) {
  test(`rejects ${label}`, t => {
    const result = fixture(t, { 'sample/SKILL.md': `---\n${frontmatter}\n---\n` });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /(?:name|description) must be a nonempty string/);
  });
}

test('rejects a skill without frontmatter', t => {
  const result = fixture(t, { 'sample/SKILL.md': '# Sample\n' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing YAML frontmatter/);
});

test('fails when no skills are found', t => {
  const result = fixture(t, { 'README.md': '# Skills\n' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no SKILL\.md files found/);
});

test('ignores dependency and git internals', t => {
  const result = fixture(t, {
    'sample/SKILL.md': valid,
    'node_modules/example/SKILL.md': 'invalid',
    '.git/example/SKILL.md': 'invalid',
  });
  assert.equal(result.status, 0, result.stderr);
});
