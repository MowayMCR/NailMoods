// Next beta candidate. Android must exceed Play closed-test versionCode 11.
// Apple build numbers are independently assigned by its TestFlight workflow.
export function mobileVersion(platform, env = process.env) {
  const iosBuild = env.NAILMOODS_IOS_BUILD_NUMBER;
  if (iosBuild && !/^[1-9]\d{0,8}$/.test(iosBuild)) throw new Error('Invalid Apple build number');
  return {
    version: '0.8.1',
    versionCode: platform === 'ios' ? (iosBuild ? Number(iosBuild) : 30000) : 12
  };
}
