import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialService, normalizeHandle } from '../src/cloud/socialService.js';

test('public handles normalize safely without changing technical ids', () => {
  assert.equal(normalizeHandle('@Marie.Nails'), 'marie.nails');
  assert.equal(normalizeHandle('admin'), null);
  assert.equal(normalizeHandle('a'), null);
});

test('social service uses the server RPCs for availability, identity and search', async () => {
  const calls = [];
  const service = createSocialService({ rpc: async (name, args) => { calls.push([name,args]); return name === 'nailmoods_handle_available' ? { data:true, error:null } : { data:[{handle:'studio.marie'}], error:null }; } });
  assert.equal(await service.isHandleAvailable('@Studio.Marie'), true);
  assert.deepEqual(await service.saveIdentity({ handle:'Studio.Marie', visibility:'pros', displayName:'Studio Marie' }), { handle:'studio.marie', visibility:'pros' });
  assert.deepEqual(await service.search('@studio'), [{handle:'studio.marie'}]);
  assert.equal(calls.length, 3);
});
