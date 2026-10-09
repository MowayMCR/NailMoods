// Store versions for the October 9 beta; preserve the existing application IDs.
export function mobileVersion(platform, env = process.env) {
  const build = platform === 'ios' ? env.NAILMOODS_IOS_BUILD_NUMBER : null;
  if (build && !/^[1-9]\d{0,8}$/.test(build)) throw new Error('Invalid iOS build number');
  return {version: '0.8.1', versionCode: build ? Number(build) : 10};
}
