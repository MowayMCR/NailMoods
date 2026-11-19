import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('actual SceneDelegate creates the view controller that registers StoreKit',()=>{
 assert.match(read('ios/App/App/SceneDelegate.swift'),/rootViewController = NailMoodsViewController\(\)/);
 assert.match(read('ios/App/App/NailMoodsViewController.swift'),/registerPluginInstance\(NailMoodsStoreKitPlugin\(\)\)/);
});
test('iOS includes camera SDK purpose strings without requesting broad photo access',()=>{
 const p=read('ios/App/App/Info.plist');
 for(const key of ['NSCameraUsageDescription','NSPhotoLibraryUsageDescription','NSPhotoLibraryAddUsageDescription']) {
   const value=p.match(new RegExp('<key>'+key+'</key>\\s*<string>([^<]+)</string>'))?.[1];
   assert.ok(value?.trim(),key+' needs a nonempty purpose string');
 }
 for(const key of ['NSMicrophoneUsageDescription','NSContactsUsageDescription','NSLocationWhenInUseUsageDescription','NSBluetoothAlwaysUsageDescription'])assert.equal(p.includes(key),false,key);
 const media=read('src/platform/nativeMedia.js');
 assert.match(media,/Camera.pickImages/);
 assert.match(media,/saveToGallery:false/);
 assert.match(media,/requestPermissions\(\{permissions:\['camera'\]\}\)/);
 assert.doesNotMatch(media,/requestPermissions\(\s*\)/);
});
test('billing transaction is finished only after successful server delivery',()=>{
 const source=read('src/cloud/appleBilling.js');assert.ok(source.indexOf('if(!result.ok||!result.entitlement)')<source.indexOf('await store.finish'));
 assert.equal(read('ios/App/App/NailMoodsStoreKitPlugin.swift').includes('await transaction.finish()'),false);
});
test('TestFlight environment loading does not refresh or synchronize Apple authentication',()=>{
 const native=read('ios/App/App/NailMoodsStoreKitPlugin.swift');
 const environment=native.slice(native.indexOf('@objc func getEnvironment'),native.indexOf('@objc func getProducts'));
 assert.doesNotMatch(environment,/AppTransaction\.refresh|AppStore\.sync/);
 assert.match(environment,/NailMoodsStoreKitEnvironment/);
 assert.match(read('.github/workflows/ios-testflight.yml'),/NAILMOODS_STOREKIT_ENVIRONMENT: Sandbox/);
});

test('iOS auth URL scheme matches the already established mobile PKCE callback',()=>{
 assert.match(read('ios/App/App/Info.plist'),/<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>com.nailmoods.app(?:.recette)?<\/string>/);
 assert.match(read('scripts/build-ios.mjs'),/com.nailmoods.app.recette/);
});

test('AdMob candidate declares ATT and builds the native privacy guards',()=>{
 assert.match(read('ios/App/App/Info.plist'),/<key>NSUserTrackingUsageDescription<\/key>\s*<string>[^<]+<\/string>/);
 assert.match(read('scripts/build-ios.mjs'),/patch-admob-ios-privacy/);
 const guard=read('ios/privacy/AdMobPrivacyGuard.swift.txt');
 assert.match(guard,/ATTrackingManager.trackingAuthorizationStatus == .authorized/);
 assert.match(guard,/nmBit\(purpose, 1\).*nmBit\(purpose, 3\).*nmBit\(purpose, 4\)/);
 assert.match(guard,/IABTCF_VendorConsents.*755/);
 assert.match(guard,/willResignActiveNotification/);
});
