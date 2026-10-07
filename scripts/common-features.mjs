// The same approved application features ship on Web, Android and iOS.
// Billing bridges remain platform-specific; access still requires server rights.
export function commonFeatures(environment,env=process.env){
 if(!['production','recette'].includes(environment))throw Error('Unknown environment');
 const defaults={VITE_PRO_V2_ENABLED:'true',VITE_POSE_CYCLE_ENABLED:'true',VITE_PO_LOOP_ENABLED:'true',VITE_CATALOGUE_ADMIN_ENABLED:'true',VITE_SESSION_SECURITY_ENABLED:'false',VITE_INSTITUTE_ACCESS_ENABLED:'false'};
 return Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>{const value=env[key]??fallback;if(!['true','false'].includes(value))throw Error('Invalid feature flag: '+key);return [key,value];}));
}
