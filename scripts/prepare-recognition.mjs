import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const destination = new URL('../public/recognition/', import.meta.url);
await mkdir(destination, { recursive: true });
const core = path.dirname(require.resolve('tesseract.js-core/package.json'));
for (const file of await readdir(core)) if (/\.wasm(?:\.js)?$/.test(file) || file === 'LICENSE') await copyFile(path.join(core, file), new URL(file, destination));
await copyFile(require.resolve('tesseract.js/dist/worker.min.js'), new URL('worker.min.js', destination));
for (const lang of ['eng', 'fra']) {
  const folder = path.dirname(require.resolve(`@tesseract.js-data/${lang}/package.json`));
  await copyFile(path.join(folder, '4.0.0_best_int', `${lang}.traineddata.gz`), new URL(`${lang}.traineddata.gz`, destination));
}
console.log('Recognition assets ready (loaded only when requested).');
