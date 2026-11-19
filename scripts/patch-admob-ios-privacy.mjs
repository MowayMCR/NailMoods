// Narrow, version-checked native privacy guard. Third-party manifests stay intact.
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../node_modules/@capacitor-community/admob/',import.meta.url);
if(JSON.parse(readFileSync(new URL('package.json',root))).version!=='8.2.0')throw Error('Review AdMob privacy patch for the new plugin version');
const file=new URL('ios/Sources/AdMobPlugin/AdMobPlugin.swift',root);
let code=readFileSync(file,'utf8');
const marker='// NailMoods ATT/UMP native guard v1';
if(!code.includes(marker)){
 code=code.replace('import GoogleMobileAds','import GoogleMobileAds\nimport UserMessagingPlatform\nimport UIKit');
 code=code.replace('CAPPluginMethod(name: "initialize",',`CAPPluginMethod(name: "privacySnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authorizeAdSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "suspendAdSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "initialize",`);
 const extra=readFileSync(new URL('../ios/privacy/AdMobPrivacyGuard.swift.txt',import.meta.url),'utf8');
 code=code.replace('    private let consentExecutor = ConsentExecutor()', '    private let consentExecutor = ConsentExecutor()\n'+extra);
 code=code.replace('        self.consentExecutor.plugin = self','        self.consentExecutor.plugin = self\n        nmObservePrivacy()');
 // Guard the bridge entry AND queued native execution (refusal can happen between them).
 for(const name of ['initialize','showBanner','resumeBanner','prepareInterstitial','showInterstitial','prepareRewardVideoAd','showRewardVideoAd','prepareRewardInterstitialAd','showRewardInterstitialAd','loadAppOpen','showAppOpen']){
  const signature=`    @objc func ${name}(_ call: CAPPluginCall) {`;
  const start=code.indexOf(signature);if(start<0)throw Error('Missing native ad method '+name);
  const bodyStart=start+signature.length;let end=bodyStart,depth=1;
  for(;end<code.length&&depth;end++){if(code[end]==='{')depth++;if(code[end]==='}')depth--;}
  if(depth)throw Error('Invalid native method '+name);
  let body=code.slice(bodyStart,end-1);
  body=body.replaceAll('DispatchQueue.main.async {','DispatchQueue.main.async {\n            guard self.nmAdSessionAllowed() else { call.reject("ads_privacy_required"); return }');
  if(name==='initialize')body=body.replace('        self.setRequestConfiguration(call)','        MobileAds.shared.requestConfiguration.setPublisherFirstPartyIDEnabled(false)\n        self.setRequestConfiguration(call)');
  const replacement=`${signature}
        DispatchQueue.main.async {
            guard self.nmAdSessionAllowed() else { call.reject("ads_privacy_required"); return }
            self.nm_${name}(call)
        }
    }
    private func nm_${name}(_ call: CAPPluginCall) {${body}}`;
  code=code.slice(0,start)+replacement+code.slice(end);
 }
 // ATT is requested by the app after a live UMP grant, never by initialize().
 const old='ATTrackingManager.requestTrackingAuthorization(completionHandler: { _ in\n                call.resolve([:])\n            })';
 if(!code.includes(old))throw Error('ATT implementation changed');
 code=code.replace(old,`DispatchQueue.main.async {
                guard UIApplication.shared.applicationState == .active, self.nmUMPTrackingAllowed() else { call.reject("ads_consent_required"); return }
                ATTrackingManager.requestTrackingAuthorization(completionHandler: { _ in call.resolve([:]) })
            }`);
 writeFileSync(file,code);
 // A pending banner must not attach after withdrawal; destroy the retained view too.
 const bannerFile=new URL('ios/Sources/AdMobPlugin/Banner/BannerExecutor.swift',root);
 let banner=readFileSync(bannerFile,'utf8');
 banner=banner.replace('    private func removeBannerViewToView() {',`    func removeBannerViewToView() {
        bannerView?.delegate = nil
        bannerView?.removeFromSuperview()
        bannerView = nil`);
 // Old removal branch dereferenced the now-nil bannerView.
 banner=banner.replace('                bannerView.delegate = nil\n','');
 banner=banner.replace('        NSLog("bannerViewDidReceiveAd")',`        guard plugin?.nmAdSessionAllowed() == true else {
            bannerView.delegate = nil; bannerView.removeFromSuperview(); self.bannerView = nil
            return
        }
        NSLog("bannerViewDidReceiveAd")`);
 writeFileSync(bannerFile,banner);
}
console.log('AdMob native ATT/UMP guards applied; original SDK manifests preserved');
