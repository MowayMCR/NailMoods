import type { CapacitorConfig } from '@capacitor/cli';
const environment = process.env.NAILMOODS_MOBILE_ENV;
if (!['production', 'recette'].includes(environment || '')) throw new Error('Set NAILMOODS_MOBILE_ENV explicitly');
const config: CapacitorConfig = {
  appId: environment === 'production' ? 'com.nailmoods.app' : 'com.nailmoods.app.recette',
  appName: environment === 'production' ? 'NailMoods' : 'NailMoods Recette',
  webDir: 'dist-mobile', backgroundColor: '#fffaf7', loggingBehavior: 'none',
  android: { backgroundColor: '#fffaf7' },
  plugins: {
    SplashScreen: { launchShowDuration: 400, launchAutoHide: true, backgroundColor: '#fffaf7', showSpinner: false },
    Keyboard: { resize: 'body', resizeOnFullScreen: true },
  },
};
export default config;
