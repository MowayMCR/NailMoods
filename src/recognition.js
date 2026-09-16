export async function imageCanvas(source, signal, maxSize = 1400) {
  const image = new window.Image();
  image.crossOrigin = 'anonymous';
  image.referrerPolicy = 'no-referrer';
  await new Promise((resolve, reject) => {
    const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Annulé', 'AbortError')); };
    const timeout = setTimeout(() => { cleanup(); image.src = ''; reject(new Error('La photo met trop de temps à charger. Importe-la depuis ta galerie.')); }, 20000);
    function cleanup() { clearTimeout(timeout); signal?.removeEventListener('abort', abort); image.onload = null; image.onerror = null; }
    image.onload = () => { cleanup(); resolve(); };
    image.onerror = () => { cleanup(); reject(new Error('Cette photo ne peut pas être analysée. Importe une capture ou une photo depuis ta galerie.')); };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    image.src = source;
  });
  if (signal?.aborted) throw new DOMException('Annulé', 'AbortError');
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Cette image ne peut pas être analysée sur cet appareil.');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function readPhotoText(source, signal, onProgress) {
  const canvas = await imageCanvas(source, signal, 1800);
  const { createWorker } = await import('tesseract.js');
  if (signal.aborted) throw new DOMException('Annulé', 'AbortError');
  let worker, finished = false, rejectTask;
  const stopped = new Promise((_, reject) => { rejectTask = reject; });
  const abort = () => rejectTask(new DOMException('Annulé', 'AbortError'));
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => rejectTask(new Error('La lecture prend trop de temps. Essaie une photo recadrée sur l’étiquette.')), 90000);
  const base = new URL(import.meta.env.BASE_URL + 'recognition/', window.location.origin).href;
  try {
    const work = (async () => {
      worker = await createWorker(['fra', 'eng'], 1, {
        workerPath: base + 'worker.min.js', corePath: base, langPath: base.slice(0, -1), workerBlobURL: false,
        logger: event => { if (!finished && event.status === 'recognizing text') onProgress(Math.round(event.progress * 100)); },
        errorHandler: () => rejectTask(new Error('La lecture de l’étiquette est indisponible. Vérifie ta connexion ou réessaie avec une photo plus nette.')),
      });
      if (finished || signal.aborted) { await worker.terminate(); throw new DOMException('Annulé', 'AbortError'); }
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      const { data } = await worker.recognize(canvas);
      return data.text.trim().slice(0, 6000);
    })();
    return await Promise.race([work, stopped]);
  } finally { finished = true; clearTimeout(timeout); signal.removeEventListener('abort', abort); if (worker) await worker.terminate(); }
}

export async function readBarcodePhoto(file, signal) {
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) throw new Error('Choisis une photo de moins de 20 Mo.');
  const source = URL.createObjectURL(file);
  try {
    const canvas = await imageCanvas(source, signal, 2000);
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
    if (signal.aborted) throw new DOMException('Annulé', 'AbortError');
    const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.ITF]], [DecodeHintType.TRY_HARDER, true]]);
    const reader = new BrowserMultiFormatReader(hints);
    try { return reader.decodeFromCanvas(canvas).getText(); }
    catch { throw new Error('Code-barres illisible. Reprends-le de près, bien à plat, ou saisis les chiffres.'); }
  } finally { URL.revokeObjectURL(source); }
}
