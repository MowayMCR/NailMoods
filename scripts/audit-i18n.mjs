import fs from 'node:fs';
import path from 'node:path';
import {messages} from '../src/i18n/messages.js';
import {LOCALES} from '../src/i18n/locale.js';

const missing = [];
const keys = Object.keys(messages.fr);
for (const {code} of LOCALES) {
  for (const key of keys) if (!messages[code]?.[key]?.trim()) missing.push(`${code}:${key}`);
  for (const key of Object.keys(messages[code])) if (!Object.hasOwn(messages.fr, key)) missing.push(`orphan:${code}:${key}`);
}
const candidates = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.jsx$/.test(file) && !file.includes('/i18n/')) {
      const source = fs.readFileSync(file, 'utf8');
      source.split('\n').forEach((line, i) => {
        // Review candidates only: this is not a complete parser or readiness certification.
        const texts = [...line.matchAll(/>([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)</g)].map(x=>x[1].trim()).filter(Boolean);
        if (texts.length) candidates.push({file, line:i+1, texts});
      });
    }
  }
}
walk('src');
console.log(JSON.stringify({dictionaryKeys:keys.length, locales:LOCALES.map(x=>x.code), missing, staticTextCandidates:candidates, commercialReady:false}, null, 2));
if (missing.length || process.argv.includes('--release')) process.exitCode = 1;
