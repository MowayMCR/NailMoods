import { matchCatalog } from './catalog.js';
import { parseProductText, recognitionPresentation } from './productIdentity.js';
export function recognizeEvidence(products, input = {}, {brand='',collection='',hasColor=false,catalogAvailable=true,ocr=true} = {}) {
  const parsed=parseProductText(input.rawText,products,{brand,collection,ocr});
  const barcodes=[...new Map([...(input.barcodes || []),...parsed.barcodes].map(b=>[b.rawBarcode+'|'+b.barcodeSource,b])).values()];
  const matches=matchCatalog(products,input.rawText || '',{brand:parsed.brand,collection:parsed.collection,ocr,barcodes});
  const presentation=recognitionPresentation({...input,matches,barcodes,parsed,hasColor,catalogAvailable});
  return {...input,rawText:parsed.rawText,barcodes,parsed,matches,catalogAvailable,hasColor,...presentation,at:new Date().toISOString()};
}
export function recognitionPatch(report) {
  const barcode=[...report.barcodes].reverse().find(b=>b.barcodeSource==='scanner') || report.barcodes.at(-1);
  // Preserve the evidence for an unknown code as well as for a confirmed match.
  return {...(barcode?{...barcode,barcode:barcode.rawBarcode}:{}),recognitionInfo:{...report,matches:report.matches.map(m=>({...m,product:{catalogId:m.product.catalogId,brand:m.product.brand,collection:m.product.collection,name:m.product.name,reference:m.product.reference}}))}};
}
export function diagnosticText(report) {
  return JSON.stringify({date:report.at,brand:report.parsed?.brand || '',collection:report.parsed?.collection || '',shadeCodes:report.parsed?.shadeCodes || [],ignoredNumbers:report.parsed?.ignoredNumbers || [],rawOCR:(report.ocrViews || []).map(view=>view.text),matchingText:report.rawText || '',barcodes:report.barcodes || [],barcodeAttempted:Boolean(report.barcodeAttempted),barcodeError:report.barcodeError || '',ocrError:report.ocrError || '',catalogAvailable:report.catalogAvailable,candidates:(report.matches || []).map(m=>({id:m.product.catalogId,brand:m.product.brand,name:m.product.name,reference:m.product.reference,score:m.score,evidence:m.evidence,reason:m.reason})),failure:report.failure || '',barcodeState:report.barcodeState},null,2);
}

export function pendingBarcodeReport(previous = {}, observation) {
  const barcodes=[...new Map([...(previous.barcodes || []),observation].map(b=>[b.rawBarcode+'|'+b.barcodeSource,b])).values()];
  return {...previous,barcodes,rawText:previous.rawText || '',matches:[],title:'Code-barres lu',message:'Le code est conservé. Lecture de l’étiquette en cours…',needsSecondView:true,barcodeState:'read_pending',failure:'',barcodeAttempted:true,at:new Date().toISOString()};
}

export function interruptedRecognition(report) {
  return report?.barcodeState==='read_pending' ? {...report,barcodeState:'read_unresolved',message:'Le code lu est conservé. La lecture a été interrompue ; tu peux continuer avec la couleur ou relancer la recherche.',failure:'recognition_interrupted'} : report;
}
