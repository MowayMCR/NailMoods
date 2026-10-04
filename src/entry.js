import {applyMood,moodFor} from './design/themes.js';
try{const saved=JSON.parse(localStorage.getItem('nm-boot-mood-v2')||'null');applyMood(moodFor(saved?.id));}catch{applyMood(moodFor());}
if (import.meta.env.VITE_NATIVE_BUILD && globalThis.Capacitor?.isNativePlatform?.()) {
  const { initializeNative } = await import('./platform/nativeRuntime.js');
  await initializeNative();
}
await import('./main.jsx');
