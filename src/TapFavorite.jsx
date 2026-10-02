import React,{useEffect,useRef,useState} from 'react';
// Delay the single tap so opening a fiche cannot swallow the second tap.
// Keyboard activation remains immediate and visible favorite buttons remain.
export default function TapFavorite({as:Tag='div',onOpen,onToggle,saved,children,...props}){
  const timer=useRef(null),last=useRef(0),busy=useRef(false),noticeTimer=useRef(null),[notice,setNotice]=useState('');
  useEffect(()=>()=>{clearTimeout(timer.current);clearTimeout(noticeTimer.current);},[]);
  async function toggle(){if(busy.current)return;busy.current=true;try{const ok=await onToggle();if(ok!==false){setNotice(saved?'Favori retiré':'Ajouté aux favoris');clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),1600);}}finally{busy.current=false;}}
  function click(e){e.stopPropagation();const interactive=e.target.closest('button,a,input,select');if(interactive&&interactive!==e.currentTarget)return;if(e.detail===0){onOpen();return;}const now=Date.now();if(last.current&&now-last.current<=300){clearTimeout(timer.current);last.current=0;void toggle();}else{last.current=now;clearTimeout(timer.current);timer.current=setTimeout(()=>{last.current=0;onOpen();},300);}}
  return <Tag {...props} {...(Tag==='button'?{type:'button'}:{role:'button',tabIndex:0,onKeyDown:e=>{if(e.target!==e.currentTarget)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onOpen();}}})} onClick={click}>{children}{notice&&<span className="tapFavoriteNotice" role="status">{notice}</span>}</Tag>;
}
