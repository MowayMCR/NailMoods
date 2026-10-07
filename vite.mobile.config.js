import {mobileFeatures} from './scripts/mobile-features.mjs';
import { mobileVersion } from './scripts/mobile-version.mjs';
import {fileURLToPath} from 'node:url';
import { defineConfig, mergeConfig } from 'vite';
import webConfig from './vite.config.js';

export default defineConfig(() => {
  const environment = process.env.NAILMOODS_MOBILE_ENV;
  if (!['production', 'recette'].includes(environment)) throw new Error('NAILMOODS_MOBILE_ENV must explicitly be production or recette');
  process.env.VITE_DEPLOYMENT_ENV = environment;
  const ios=process.env.NAILMOODS_PLATFORM==='ios';
  return mergeConfig(webConfig(), {
    resolve:{alias:ios?[
      {find:/\.\/googlePlayBilling(?:\.js)?$/,replacement:fileURLToPath(new URL('./src/platform/googleBillingUnavailable.js',import.meta.url))},
      {find:/\.\/GooglePlayBillingSync(?:\.jsx)?$/,replacement:fileURLToPath(new URL('./src/platform/emptyBillingSync.js',import.meta.url))},
      {find:/\.\/GooglePlayBillingPanel(?:\.jsx)?$/,replacement:fileURLToPath(new URL('./src/platform/emptyBillingSync.js',import.meta.url))}
    ]:[]},
    base: './', build: { outDir: 'dist-mobile', emptyOutDir: true },
    define: { 'import.meta.env.VITE_INTERNAL_AI_BUILD':JSON.stringify(!ios), 'import.meta.env.VITE_POSE_CYCLE_ENABLED': JSON.stringify(String(mobileFeatures(environment).poseCycle)), 'import.meta.env.VITE_NATIVE_BUILD': 'true', 'import.meta.env.VITE_APP_VERSION': JSON.stringify(mobileVersion(process.env.NAILMOODS_PLATFORM).version) },
  });
});
