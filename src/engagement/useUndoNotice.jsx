import React,{useEffect,useRef,useState} from 'react';
import './engagement.css';
export default function useUndoNotice(scope) {
  const [notice,setNotice]=useState(null),timer=useRef(null);
  useEffect(()=>{setNotice(null);clearTimeout(timer.current);return()=>clearTimeout(timer.current);},[scope]);
  function show(message,undo) {clearTimeout(timer.current);setNotice({message,undo,scope});timer.current=setTimeout(()=>setNotice(null),15000);}
  function pause(){clearTimeout(timer.current);}
  const current=notice?.scope===scope?notice:null;
  const element=current&&<div className="nmUndoNotice" role="status" onMouseEnter={pause} onFocus={pause}><span>{current.message}</span>{current.undo&&<button onClick={()=>{if(current.undo()!==false){clearTimeout(timer.current);setNotice(null);}}}>Annuler</button>}<button aria-label="Fermer la notification" onClick={()=>{clearTimeout(timer.current);setNotice(null);}}>×</button></div>;
  return {show,element};
}
