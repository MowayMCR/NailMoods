// Release temporary pixel buffers as soon as processing finishes. Never use on
// the visible drawing canvas or on a persisted draft/source image.
export function releaseCanvas(canvas) {
  if (canvas) { canvas.width = 0; canvas.height = 0; }
}

export async function withTemporaryCanvas(canvas, operation) {
  try { return await operation(canvas); }
  finally { releaseCanvas(canvas); }
}
