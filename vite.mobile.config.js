import { mobileVersion } from './scripts/mobile-version.mjs';
import { defineConfig, mergeConfig } from 'vite';
import webConfig from './vite.config.js';

export default defineConfig(() => {
  const environment = process.env.NAILMOODS_MOBILE_ENV;
  if (!['production', 'recette'].includes(environment)) throw new Error('NAILMOODS_MOBILE_ENV must explicitly be production or recette');
  process.env.VITE_DEPLOYMENT_ENV = environment;
  return mergeConfig(webConfig(), {
    base: './', build: { outDir: 'dist-mobile', emptyOutDir: true },
    define: { 'import.meta.env.VITE_NATIVE_BUILD': 'true', 'import.meta.env.VITE_APP_VERSION': JSON.stringify(mobileVersion(process.env.NAILMOODS_PLATFORM).version) },
  });
});
