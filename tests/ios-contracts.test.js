import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('actual SceneDelegate creates the view controller that registers StoreKit',()=>{
 assert.match(read('ios/App/App/SceneDelegate.swift'),/rootViewController = NailMoodsViewController\(\)/);
 assert.match(read('ios/App/App/NailMoodsViewController.swift'),/registerPluginInstance\(NailMoodsStoreKitPlugin\(\)\)/);
});
test('iOS permission surface excludes unrestricted photos, tracking and unused sensors',()=>{
 const p=read('ios/App/App/Info.plist');assert.match(p,/NSCameraUsageDescription/);
 for(const key of ['NSPhotoLibraryUsageDescription','NSPhotoLibraryAddUsageDescription','NSMicrophoneUsageDescription','NSContactsUsageDescription','NSLocationWhenInUseUsageDescription','NSUserTrackingUsageDescription','NSBluetoothAlwaysUsageDescription'])assert.equal(p.includes(key),false,key);
 assert.match(read('src/platform/nativeMedia.js'),/Camera.pickImages/);
});
test('billing transaction is finished only after successful server delivery',()=>{
 const source=read('src/cloud/appleBilling.js');assert.ok(source.indexOf('if(!result.ok||!result.entitlement)')<source.indexOf('await AppleBilling.finish'));
 assert.equal(read('ios/App/App/NailMoodsStoreKitPlugin.swift').includes('await transaction.finish()'),false);
});

test('iOS auth URL scheme matches the already established mobile PKCE callback',()=>{
 assert.match(read('ios/App/App/Info.plist'),/<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>com.nailmoods.app.recette<\/string>/);
 assert.match(read('scripts/build-ios.mjs'),/com.nailmoods.app.recette/);
});
