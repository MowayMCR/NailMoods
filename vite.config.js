import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import recette from './src/cloud/recette-public-config.json'

export default defineConfig(() => {
  const target = process.env.VITE_DEPLOYMENT_ENV || 'recette';
  if (!['recette','production'].includes(target)) throw new Error('Unknown deployment environment');
  const config = target === 'recette' ? recette : {
    VITE_SUPABASE_URL: 'https://rvqmtnqvzzxzwfxfyjcg.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_EZthbmym16fnDWx9W6RkEg_ublzI88l',
    VITE_DEPLOYMENT_ENV: 'production', VITE_BETA_ACCOUNT_TIERS: 'false'
  };
  return { server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] }, plugins: [react()], base: target === 'production' ? '/NailMoods/' : '/',
    define: Object.fromEntries(Object.entries(config).map(([key,value])=>[`import.meta.env.${key}`,JSON.stringify(value)])) };
});
