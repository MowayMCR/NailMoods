export const TEST_BANNER_UNITS=Object.freeze({android:'ca-app-pub-3940256099942544/6300978111',ios:'ca-app-pub-3940256099942544/2934735716'});
export const TEST_REWARDED_UNITS=Object.freeze({android:'ca-app-pub-3940256099942544/5224354917',ios:'ca-app-pub-3940256099942544/1712485313'});
// There is deliberately no production unit or personalized request in this release.
export function adAllowed({platform,rights,config,placement,consent}){
 return ['ios','android'].includes(platform)&&rights?.effectiveTier==='free'&&!rights?.instituteActive&&config?.enabled===true&&config?.testOnly===true&&['rewarded_opt_in','banner_opt_in'].includes(placement)&&consent===true;
}
