if (import.meta.env.VITE_NATIVE_BUILD && globalThis.Capacitor?.isNativePlatform?.()) {
  const { initializeNative } = await import('./platform/nativeRuntime.js');
  await initializeNative();
}
await import('./main.jsx');
