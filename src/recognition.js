import { barcodeObservation } from './productIdentity.js';
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
  const base = new URL(import.meta.env.BASE_URL + 'recognition/', document.baseURI).href;
  try {
    const work = (async () => {
      worker = await createWorker(['fra', 'eng'], 1, {
        workerPath: base + 'worker.min.js', corePath: base, langPath: base.slice(0, -1), workerBlobURL: false,
        // Android's asset packager expands .gz language files and removes that suffix.
        gzip: !import.meta.env.VITE_NATIVE_BUILD || globalThis.Capacitor?.getPlatform?.() !== 'android',
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

let barcodeReader;
export async function readBarcodeSource(source, signal) {
  const canvas = await imageCanvas(source, signal, 2400);
  signal.throwIfAborted();
  try {
    barcodeReader ||= import('zxing-wasm/reader').then(module=>{
      const base=new URL(import.meta.env.BASE_URL+'recognition/',document.baseURI).href;
      module.prepareZXingModule({overrides:{locateFile:path=>base+path}});
      return module;
    }).catch(error=>{barcodeReader=null;throw error;});
    const {readBarcodes}=await barcodeReader;
    const results=await readBarcodes(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),{formats:['EANUPC','ITF','Code128','Code39'],tryHarder:true,tryRotate:true,tryInvert:true,maxNumberOfSymbols:2,textMode:'Plain'});
    signal.throwIfAborted();
    const codes=results.filter(result=>result.isValid);
    if(codes.length>1){const error=new Error('Plusieurs codes sont visibles. Cadre un seul code ou saisis-le manuellement.');error.code='BARCODE_AMBIGUOUS';throw error;}
    if(codes.length){const result=codes[0];let extra={};try{extra=JSON.parse(result.extra||'{}');}catch{}
      const format=({EAN13:'EAN_13',EAN8:'EAN_8',UPCA:'UPC_A',UPCE:'UPC_E',ITF:'ITF',ITF14:'ITF',Code128:'CODE_128',Code39:'CODE_39',Code39Std:'CODE_39',Code39Ext:'CODE_39'})[result.format]||'UNKNOWN';
      // ZXing-C++ normalizes UPC-E to UPC-A; preserve the observed eight digits.
      return barcodeObservation(format==='UPC_E'&&/^\d{8}$/.test(extra.UPCE)?extra.UPCE:result.text,format,'scanner');
    }
  } catch(error){if(signal.aborted||error.code==='BARCODE_AMBIGUOUS')throw error;const failure=new Error('Le lecteur de code n’a pas pu démarrer. Réessaie ou saisis le code et le nom manuellement.');failure.code='BARCODE_UNAVAILABLE';throw failure;}
  const error=new Error('Code-barres non lu. Cadre le code entier, bien à plat, ou photographie l’étiquette dessous / au dos.');error.code='BARCODE_UNREAD';throw error;
}

export async function readBarcodeDetails(file, signal) {
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) throw new Error('Choisis une photo de moins de 20 Mo.');
  const source=URL.createObjectURL(file);
  try {return await readBarcodeSource(source,signal);} finally {URL.revokeObjectURL(source);}
}
// Preserve the existing string API for any other consumers.
export async function readBarcodePhoto(file, signal) { return (await readBarcodeDetails(file,signal)).rawBarcode; }

// Independent reads: a missing catalogue or failed OCR never discards a decoded code.
export async function readProductPhoto(source, signal, onProgress = () => {}, onBarcode = () => {}) {
  const [barcode,ocr]=await Promise.allSettled([
    readBarcodeSource(source,signal).then(value=>{if(!signal.aborted)onBarcode(value);return value;}),
    readPhotoText(source,signal,onProgress),
  ]);
  if(signal.aborted)throw new DOMException('Annulé','AbortError');
  return {rawText:ocr.status==='fulfilled'?ocr.value:'',ocrViews:ocr.status==='fulfilled'?[{text:ocr.value}]:[],barcodes:barcode.status==='fulfilled'?[barcode.value]:[],barcodeAttempted:true,barcodeError:barcode.status==='rejected'?barcode.reason?.code || 'BARCODE_UNAVAILABLE':'',ocrError:ocr.status==='rejected'?'OCR_UNAVAILABLE':''};
}
