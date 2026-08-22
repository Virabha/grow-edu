import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MARKERS = [
  'MODEL_PROVIDER',
  'AiService',
  'AiBatchService',
  'completeStructured',
  'completeText',
];

function walk(directory) {
  let out = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      out = out.concat(walk(full));
      continue;
    }
    if (!entry.endsWith('.ts') || entry.endsWith('.spec.ts')) continue;
    out.push(full);
  }
  return out;
}

const files = walk('src').filter((file) => {
  const source = readFileSync(file, 'utf8');
  return MARKERS.some((marker) => source.includes(marker));
});

console.log('model-touching files:', files.length);
for (const file of files) {
  console.log('  ' + file.replaceAll('\\', '/'));
}
