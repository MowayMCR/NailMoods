import test from 'node:test';
import assert from 'node:assert/strict';
import { withTemporaryCanvas } from '../src/imageResources.js';

test('temporary pixels remain valid until asynchronous processing completes', async () => {
  const canvas = { width: 1800, height: 1200 };
  const result = await withTemporaryCanvas(canvas, async image => {
    await Promise.resolve();
    assert.deepEqual(image, { width: 1800, height: 1200 });
    return { text: 'Vernis', color: '#884455' };
  });
  assert.deepEqual(result, { text: 'Vernis', color: '#884455' });
  assert.deepEqual(canvas, { width: 0, height: 0 });
});

test('failed and cancelled operations release pixels without masking the error', async () => {
  for (const error of [new Error('Decode failed'), new DOMException('Cancelled', 'AbortError')]) {
    const canvas = { width: 2400, height: 1800 };
    await assert.rejects(withTemporaryCanvas(canvas, async () => { throw error; }), value => value === error);
    assert.deepEqual(canvas, { width: 0, height: 0 });
  }
});
