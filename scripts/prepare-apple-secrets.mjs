// Run only on the key owner's computer, with inputs outside the repository.
import {readFileSync,writeFileSync} from 'node:fs';
const [output,keyPath,keyId,issuerId,bundleId,appId,environments,...roots]=process.argv.slice(2);
if(!output||!keyPath||!keyId||!issuerId||!bundleId||!appId||!environments||!roots.length){
 console.log('Usage: node scripts/prepare-apple-secrets.mjs /private/output.env /private/key.p8 KEY_ID ISSUER_ID BUNDLE_ID NUMERIC_APP_ID Sandbox|Production,Sandbox /private/root.der [...]');process.exit(1);
}
if(!/^\d+$/.test(appId)||!environments.split(',').every(x=>['Sandbox','Production'].includes(x)))throw Error('Invalid app ID or environment');
const pem=readFileSync(keyPath,'utf8');if(!pem.includes('-----BEGIN PRIVATE KEY-----'))throw Error('Expected an Apple PKCS8 p8 file');
const values={APPLE_PRIVATE_KEY_P8:pem,APPLE_KEY_ID:keyId,APPLE_ISSUER_ID:issuerId,APPLE_BUNDLE_ID:bundleId,APPLE_APP_ID:appId,APPLE_ENVIRONMENTS:environments,APPLE_ROOT_CERTIFICATES_BASE64_JSON:JSON.stringify(roots.map(p=>readFileSync(p).toString('base64')))};
// JSON quoting is a dotenv value, not shell interpolation. No secrets to stdout.
writeFileSync(output,Object.entries(values).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log('Secret file created with mode 600. Import it directly into the selected Supabase project; do not share it.');
