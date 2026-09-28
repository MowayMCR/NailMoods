import { withTimeout } from '../platform/network.js';
import { nativeServices } from '../platform/state.js';
import {diagnosticFetch} from '../support/diagnostics.js';
import { createClient } from '@supabase/supabase-js';
import { publicCloudConfig } from './config.js';
let client;
export function getCloudClient() {
  if (client) return client;
  const config = publicCloudConfig(import.meta.env);
  if (!config) return null;
  client = createClient(config.url, config.key, {
    global: {fetch: nativeServices()?withTimeout(diagnosticFetch):diagnosticFetch},
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      detectSessionInUrl: false, // explicitly exchanged before mounting the app
      storageKey: 'nailmoods-auth-v1',
      ...(nativeServices()?.authStorage ? {storage:nativeServices().authStorage} : {}),
    },
  });
  return client;
}
