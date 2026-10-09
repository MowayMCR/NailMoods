export const TEST_REWARDED_UNITS=Object.freeze({android:'ca-app-pub-3940256099942544/5224354917',ios:'ca-app-pub-3940256099942544/1712485313'});
// There is deliberately no production unit or personalized request in this release.
export function adAllowed({platform,rights,config,placement,consent}){
 return ['ios','android'].includes(platform)&&rights?.effectiveTier==='free'&&!rights?.instituteActive&&config?.enabled===true&&config?.testOnly===true&&placement==='rewarded_opt_in'&&consent===true;
}
