// Production defaults are preserved; release CI always injects its unique build.
export function mobileVersion(platform, env=process.env) {
 const build=platform==='ios'?env.NAILMOODS_IOS_BUILD_NUMBER:env.NAILMOODS_ANDROID_BUILD_NUMBER;
 const version=env.NAILMOODS_VERSION||'0.8.0';
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid store version');
 if(build&&!/^[1-9]\d{0,8}$/.test(build))throw Error('Invalid store build number');
 return {version,versionCode:build?Number(build):platform==='ios'?6:8};
}

// One publication workflow owns this sequence; older standalone iOS uploads used 50M.
export function coordinatedBuildNumber(runNumber, attempt) {
 const run=Number(runNumber), retry=Number(attempt);
 if(!Number.isSafeInteger(run)||run<1||!Number.isSafeInteger(retry)||retry<1||retry>=100)throw Error('Invalid release run or attempt');
 const build=60000000+run*100+retry;
 if(!Number.isSafeInteger(build)||build>999999999)throw Error('Store build sequence exhausted');
 return build;
}
