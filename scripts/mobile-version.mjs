// Keep embedded web diagnostics and native store versions in sync.
export function mobileVersion(platform, env = process.env) {
  if (platform === 'ios' && env.NAILMOODS_IOS_BUILD_NUMBER) {
    const build = env.NAILMOODS_IOS_BUILD_NUMBER;
    if (!/^[1-9]\d{0,8}$/.test(build)) throw new Error('Invalid iOS build number');
    return {version: '0.8.0', versionCode: Number(build)};
  }
  return {version: '0.8.0', versionCode: 9};
}
