import type { CapacitorConfig } from '@capacitor/cli';
const environment = process.env.NAILMOODS_MOBILE_ENV;
if (!['production', 'recette'].includes(environment || '')) throw new Error('Set NAILMOODS_MOBILE_ENV explicitly');
const config: CapacitorConfig = {
  appId: process.env.NAILMOODS_PLATFORM === 'ios' && process.env.NAILMOODS_IOS_BUNDLE_ID ? process.env.NAILMOODS_IOS_BUNDLE_ID : environment === 'production' ? 'com.nailmoods.app' : 'com.nailmoods.app.recette',
  ios: { backgroundColor: '#fffaf7' },
  appName: environment === 'production' ? 'NailMoods' : 'NailMoods Recette',
  webDir: 'dist-mobile', backgroundColor: '#fffaf7', loggingBehavior: 'none',
  android: { backgroundColor: '#fffaf7' },
  plugins: {
    SplashScreen: { launchShowDuration: 400, launchAutoHide: true, backgroundColor: '#fffaf7', showSpinner: false },
    LocalNotifications: { presentationOptions: ['banner', 'list', 'sound'] },
    Keyboard: { resize: 'body', resizeOnFullScreen: true },
  },
};
export default config;
