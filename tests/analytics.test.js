import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMetadata } from '../src/analytics/analytics.js';
test('analytics metadata keeps only scalar technical values', () => {
  assert.deepEqual(sanitizeMetadata({ source: 'manual', image: { private: true }, prompt: ['secret'], Bad: 'x', count: 2 }), { source: 'manual', count: 2 });
});
