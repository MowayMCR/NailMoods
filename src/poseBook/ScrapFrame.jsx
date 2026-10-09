import React,{useId} from 'react';
// The photo window is shared with the CSS layout in the editor and reader.
export default function ScrapFrame({frame='classic',className=''}){
 const id=useId().replace(/:/g,'');
 const kind=['classic','torn','gold'].includes(frame)?frame:'classic';
 return <svg className={className} viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true"><defs><mask id={id}><rect width="100" height="125" fill="white"/><rect x="12" y="18.125" width="76" height="76.25" fill="black"/></mask></defs><g mask={`url(#${id})`}><rect x="10" y="14" width="80" height="82" fill="#fffaf1"/><image href={import.meta.env.BASE_URL+`atelier/scrapbook-v3/frame-${kind}.webp`} width="100" height="125" preserveAspectRatio="none"/></g><rect x="12" y="18.125" width="76" height="76.25" rx=".6" fill="none" stroke={kind==='gold'?'#b49a5e':'#927553'} strokeWidth=".35"/></svg>;
}
