import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseDocument } from 'yaml';

function findSkills(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findSkills(path);
    return entry.isFile() && entry.name === 'SKILL.md' ? [path] : [];
  });
}

function validateSkill(path) {
  const content = readFileSync(path, 'utf8');
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) throw new Error('missing YAML frontmatter');
  const document = parseDocument(frontmatter[1]);
  if (document.errors.length) throw new Error(document.errors.map(error => error.message).join('\n'));
  const metadata = document.toJS();
  for (const field of ['name', 'description']) {
    if (typeof metadata?.[field] !== 'string' || !metadata[field].trim()) {
      throw new Error(`${field} must be a nonempty string`);
    }
  }
}

try {
  const root = resolve(process.argv[2] || '.');
  const skills = findSkills(root).sort();
  if (!skills.length) throw new Error('no SKILL.md files found');
  let failures = 0;
  for (const skill of skills) {
    try {
      validateSkill(skill);
      console.log(`Valid: ${relative(root, skill)}`);
    } catch (error) {
      failures += 1;
      console.error(`${relative(root, skill)}: ${error.message}`);
    }
  }
  if (failures) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
