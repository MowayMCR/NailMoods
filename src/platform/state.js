export const isNative = () => Boolean(import.meta.env?.VITE_NATIVE_BUILD && globalThis.Capacitor?.isNativePlatform?.());
let services = null;
export function setNativeServices(value) { services = value; }
export function nativeServices() { return services; }
let lastNotice='';
export const currentNativeNotice=()=>lastNotice;
export function nativeNotice(message) { lastNotice=message;globalThis.window?.dispatchEvent(new CustomEvent('nm-native-notice', {detail:message})); }
export const platformName = () => isNative() ? globalThis.Capacitor.getPlatform() : 'web';
