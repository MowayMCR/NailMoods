import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaStorage, mediaPath, validateImage, BUCKET, MAX_BYTES } from '../src/cloud/mediaStorage.js';

test('media paths are scoped by user and workspace and never public', () => {
  assert.equal(mediaPath({ userId:'u1', workspaceId:'w1', kind:'journal', objectId:'j1', contentType:'image/webp' }), 'u1/w1/journal/j1.webp');
  assert.equal(BUCKET, 'nailmoods-private');
});

test('media validation rejects unsupported and oversized files', () => {
  assert.throws(() => validateImage({ type:'image/gif', size:10 }), /JPG/);
  assert.throws(() => validateImage({ type:'image/jpeg', size:MAX_BYTES + 1 }), /5 Mo/);
  assert.equal(validateImage({ type:'image/jpeg', size:10 }).size, 10);
});

test('media adapter uploads with bounded type and returns a storage reference', async () => {
  const calls = [];
  const client = { storage: { from(bucket) { assert.equal(bucket, BUCKET); return {
    upload: async (path, file, options) => { calls.push({path,file,options}); return { data:{path}, error:null }; },
    createSignedUrl: async path => ({ data:{signedUrl:`signed:${path}`}, error:null }),
    remove: async paths => { calls.push({paths}); return { error:null }; },
  }; } } };
  const { upload, signedUrl } = createMediaStorage(client);
  const result = await upload({ userId:'u1', workspaceId:'w1', kind:'avatar', objectId:'profile', file:{type:'image/png',size:12} });
  assert.equal(result.path, 'u1/w1/avatar/profile.png');
  assert.equal((await signedUrl(result.path)).startsWith('signed:'), true);
 assert.equal(calls.length, 1);
});

test('published media uses the controlled reader, never a public Storage URL', () => {
  const client = { supabaseUrl:'https://example.supabase.co', storage:{ from(){ return {}; } } };
  const media = createMediaStorage(client);
  assert.equal(media.publicUrl('journal','entry-1'),'https://example.supabase.co/functions/v1/media-read?kind=journal&id=entry-1');
});
