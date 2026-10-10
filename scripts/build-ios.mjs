import {spawnSync} from 'node:child_process';
import {mobileVersion} from './mobile-version.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const environment=process.argv[2];
if(!['recette','production'].includes(environment))throw Error('Usage: node scripts/build-ios.mjs recette|production');
const admobConfig=JSON.parse(readFileSync(new URL('../src/ads/ios-config.json',import.meta.url),'utf8'));
if(!/^ca-app-pub-\d{16}~\d{10}$/.test(admobConfig.applicationId))throw Error('Invalid AdMob iOS application ID');
// Application identity is independent of ad units: beta requests stay on demo units.
const admobAppId=environment==='production'?admobConfig.applicationId:'ca-app-pub-3940256099942544~1458002511';
const env={...process.env,NAILMOODS_MOBILE_ENV:environment,NAILMOODS_PLATFORM:'ios'};
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{env,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);};
run(process.execPath,['scripts/build-mobile.mjs',environment]);
run(process.execPath,['scripts/ios-assets.mjs']);
run('npx',['--no-install','cap','sync','ios']);
const bundle=env.NAILMOODS_IOS_BUNDLE_ID||(environment==='production'?'com.nailmoods.app':'com.nailmoods.app.recette');
if(!/^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z0-9-]+)+$/.test(bundle))throw Error('Invalid iOS bundle identifier');
const plist='ios/App/App/Info.plist';
let xml=readFileSync(plist,'utf8').replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,'<key>CFBundleDisplayName</key><string>'+(environment==='production'?'NailMoods':'NailMoods Recette')+'</string>');
const admobKey=/<key>GADApplicationIdentifier<\/key>\s*<string>[^<]*<\/string>/;
if(!admobKey.test(xml))throw Error('Missing AdMob application identifier in Info.plist');
xml=xml.replace(admobKey,'<key>GADApplicationIdentifier</key><string>'+admobAppId+'</string>');
xml=xml.replace(/<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>[^<]*<\/string>/,'<key>CFBundleURLSchemes</key><array><string>'+(environment==='production'?'com.nailmoods.app':'com.nailmoods.app.recette')+'</string>');writeFileSync(plist,xml);
const project='ios/App/App.xcodeproj/project.pbxproj';
const {version,versionCode}=mobileVersion('ios',env);
writeFileSync(project,readFileSync(project,'utf8').replace(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g,(_match,value)=>`PRODUCT_BUNDLE_IDENTIFIER = ${bundle}${value.endsWith(".uitests")?".uitests":""};`).replace(/IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g,'IPHONEOS_DEPLOYMENT_TARGET = 16.0;').replace(/MARKETING_VERSION = [^;]+;/g,`MARKETING_VERSION = ${version};`).replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,`CURRENT_PROJECT_VERSION = ${versionCode};`).replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g,'TARGETED_DEVICE_FAMILY = "1,2";'));
// SDK package version is pinned independently of CLI-generated SPM file.
const spm='ios/App/CapApp-SPM/Package.swift';
writeFileSync(spm,readFileSync(spm,'utf8').replace(/from: "[\d.]+"/, 'exact: "8.5.2"'));
console.log('iOS source synchronized; compile/archive with Xcode 26+ on macOS. Bundle must be registered by Marie: '+bundle);
