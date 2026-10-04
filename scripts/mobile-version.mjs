// Keep embedded web diagnostics and the Android manifest in sync.
export function mobileVersion(platform) {
  return platform === 'ios'
    ? {version: '0.3.0-beta.6', versionCode: 6}
    : {version: '0.8.0', versionCode: 8};
}
