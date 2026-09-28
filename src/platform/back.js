export function backAction({keyboard,dialog,canGoBack,hash}) {
  if(keyboard)return 'keyboard';
  if(dialog)return 'dialog';
  if(canGoBack)return 'history';
  if(hash && hash!=='#accueil')return 'home';
  return 'minimize';
}
