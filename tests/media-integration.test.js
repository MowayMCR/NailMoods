import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Opt-in only: this test never creates accounts and refuses to run against the
// production project. Provide a dedicated Supabase preview project and two
// pre-created fixture accounts to execute it.
const env = process.env;
const configured = Boolean(env.NM_MEDIA_TEST_URL && env.NM_MEDIA_TEST_ANON_KEY && env.NM_MEDIA_TEST_A_EMAIL && env.NM_MEDIA_TEST_A_PASSWORD && env.NM_MEDIA_TEST_B_EMAIL && env.NM_MEDIA_TEST_B_PASSWORD && env.NM_MEDIA_TEST_PROJECT_REF && env.NM_MEDIA_TEST_PROJECT_REF !== 'rvqmtnqvzzxzwfxfyjcg');

function client() {
  const url=new URL(env.NM_MEDIA_TEST_URL);
  assert.notEqual(url.hostname,'rvqmtnqvzzxzwfxfyjcg.supabase.co');
  assert.ok(['localhost','127.0.0.1',`${env.NM_MEDIA_TEST_PROJECT_REF}.supabase.co`].includes(url.hostname));
  return createClient(env.NM_MEDIA_TEST_URL, env.NM_MEDIA_TEST_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

test('integration média A/B — opt-in sur projet de recette isolé', { skip: !configured }, async () => {
  const a = client(), b = client(), anon = client();
  const signedA = await a.auth.signInWithPassword({ email: env.NM_MEDIA_TEST_A_EMAIL, password: env.NM_MEDIA_TEST_A_PASSWORD });
  const signedB = await b.auth.signInWithPassword({ email: env.NM_MEDIA_TEST_B_EMAIL, password: env.NM_MEDIA_TEST_B_PASSWORD });
  assert.ifError(signedA.error); assert.ifError(signedB.error);
  const uidA = signedA.data.user.id, uidB = signedB.data.user.id;
  const workspace = await a.from('workspaces').select('id').eq('owner_user_id', uidA).eq('kind', 'personal').single();
  assert.ifError(workspace.error);
  const workspaceId = workspace.data.id;
  const id = crypto.randomUUID();
  const path = `${uidA}/${workspaceId}/journal/${id}.jpg`;
  const publicPath = path;
  const bytes = new Uint8Array([255, 216, 255, 217]);
  try {
    const upload = await a.storage.from('nailmoods-private').upload(path, new Blob([bytes], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: false });
    assert.ifError(upload.error);
    const row = await a.from('journal_entries').insert({ id, workspace_id: workspaceId, created_by: uidA, performed_on: new Date().toISOString().slice(0, 10), notes: 'media integration fixture', media_path: path, visibility: 'private', snapshot: { id, title: 'fixture' } }).select('id').single();
    assert.ifError(row.error);
    const ownerRead = await a.storage.from('nailmoods-private').download(path); assert.ifError(ownerRead.error);
    const otherRead = await b.storage.from('nailmoods-private').download(path); assert.ok(otherRead.error, 'B ne doit pas lire le privé');
    const anonRead = await anon.storage.from('nailmoods-private').download(path); assert.ok(anonRead.error, 'anon ne doit pas lire le privé');
    const publishCopy = await a.storage.from('nailmoods-public').upload(publicPath, new Blob([bytes], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: false }); assert.ifError(publishCopy.error);
    const published = await a.from('journal_entries').update({ visibility: 'public', public_media_path: publicPath }).eq('id', id).select('id').single(); assert.ifError(published.error);
    const publicUrl = `${env.NM_MEDIA_TEST_URL}/functions/v1/media-read?kind=journal&id=${id}`;
    const publicRead = await fetch(publicUrl); assert.equal(publicRead.status, 200);
    const privateAgain = await a.from('journal_entries').update({ visibility: 'private', public_media_path: null }).eq('id', id).select('id').single(); assert.ifError(privateAgain.error);
    const revoked = await fetch(publicUrl); assert.equal(revoked.status, 404);
    const ownerStillReads = await a.storage.from('nailmoods-private').download(path); assert.ifError(ownerStillReads.error);
    const directPublic = await fetch(`${env.NM_MEDIA_TEST_URL}/storage/v1/object/public/nailmoods-public/${publicPath}`); assert.notEqual(directPublic.status, 200);
    assert.notEqual(uidA, uidB);
  } finally {
    await a.from('journal_entries').delete().eq('id', id);
    await a.storage.from('nailmoods-private').remove([path]);
    await a.storage.from('nailmoods-public').remove([publicPath]);
    await a.auth.signOut(); await b.auth.signOut();
  }
});
