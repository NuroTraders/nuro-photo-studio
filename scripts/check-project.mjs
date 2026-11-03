import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const required = [
  'www/index.html', 'www/styles.css', 'www/sw.js', 'www/public/manifest.webmanifest',
  'www/public/assets/icons/icon.svg', 'www/public/theme-init.js',
  'electron/main.cjs', 'electron/preload.cjs', 'electron/electron-builder.yml',
  'README.md', 'HANDOVER.md',
];
for (const file of required) await access(new URL(`../${file}`, import.meta.url));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (pkg.dependencies && Object.keys(pkg.dependencies).length) throw new Error('Unexpected runtime dependencies in Phase 0.');
for (const file of ['electron/main.cjs', 'electron/preload.cjs']) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(`../${file}`, import.meta.url))], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Project structure OK (${required.length} required files).`);
