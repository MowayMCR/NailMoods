import {diagnosticFetch} from '../support/diagnostics.js';
import { createClient } from '@supabase/supabase-js';
import { publicCloudConfig } from './config.js';
let client;
export function getCloudClient() {
  if (client) return client;
  const config = publicCloudConfig(import.meta.env);
  if (!config) return null;
  client = createClient(config.url, config.key, {
    global: {fetch: diagnosticFetch},
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      detectSessionInUrl: false, // explicitly exchanged before mounting the app
      storageKey: 'nailmoods-auth-v1',
    },
  });
  return client;
}
