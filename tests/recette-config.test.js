import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCloudConfig} from '../src/cloud/config.js';
const key='sb_publishable_fixture';
test('recette refuses production even when beta switch is enabled',()=>{
 assert.throws(()=>publicCloudConfig({VITE_SUPABASE_URL:'https://rvqmtnqvzzxzwfxfyjcg.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_BETA_ACCOUNT_TIERS:'true'}),/production/);
 assert.throws(()=>publicCloudConfig({VITE_SUPABASE_URL:'https://other.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_DEPLOYMENT_ENV:'recette'}),/NailMoods-Recette/);
});
test('recette accepts only the designated project',()=>{
 assert.equal(publicCloudConfig({VITE_SUPABASE_URL:'https://pueqkbwfwxgqzmkauxoz.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_BETA_ACCOUNT_TIERS:'true',VITE_DEPLOYMENT_ENV:'recette'}).url,'https://pueqkbwfwxgqzmkauxoz.supabase.co');
});
