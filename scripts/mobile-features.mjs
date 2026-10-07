import {commonFeatures} from './common-features.mjs';
export function mobileFeatures(environment,env=process.env){return {poseCycle:commonFeatures(environment,env).VITE_POSE_CYCLE_ENABLED==='true'};}
