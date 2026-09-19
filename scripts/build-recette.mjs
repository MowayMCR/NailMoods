import {spawnSync} from 'node:child_process';
const env={...process.env,VITE_SUPABASE_URL:'https://pueqkbwfwxgqzmkauxoz.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_3SFQwQyxW_jiQsmhhm7wHA_4cejQynJ',VITE_BETA_ACCOUNT_TIERS:'true',VITE_DEPLOYMENT_ENV:'recette'};
delete env.VITE_SUPABASE_MEDIA_READ_URL;
const result=spawnSync('npm',['run','build','--','--base','/'],{env,stdio:'inherit'});
process.exit(result.status??1);
