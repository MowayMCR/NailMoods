export const isNative = () => Boolean(import.meta.env?.VITE_NATIVE_BUILD && globalThis.Capacitor?.isNativePlatform?.());
let services = null;
export function setNativeServices(value) { services = value; }
export function nativeServices() { return services; }
export function nativeNotice(message) { globalThis.window?.dispatchEvent(new CustomEvent('nm-native-notice', {detail:message})); }
export const platformName = () => isNative() ? globalThis.Capacitor.getPlatform() : 'web';
