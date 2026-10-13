const emit=(kind,value)=>alert('INTENTGROVE_DIAG:'+JSON.stringify({kind,value}));
export function setup(request){
 document.addEventListener('securitypolicyviolation',e=>emit('csp',{directive:e.effectiveDirective,blocked:e.blockedURI}));
 try{window.__TAURI_INTERNALS__.invoke('read_document',{});emit('bridge-unexpected',true)}catch(e){emit('bridge-denied',String(e))}
 try{window.webkit.messageHandlers.ipc.postMessage('{}');emit('wk-unexpected',true)}catch(e){emit('wk-denied',String(e))}
 emit('authority',{tauri:typeof window.__TAURI_INTERNALS__,webkit:typeof window.webkit,external:typeof window.external,top:window.top===window,parent:window.parent===window});
 if(window.__diagMode==='resources'){
  for(const url of ['https://127.0.0.1:9/probe','file:///private/tmp/intentgrove-diag-denied','http://127.0.0.1:9/probe']){
   emit('resource-attempt',url);fetch(url).then(()=>emit('fetch-unexpected',url),()=>emit('fetch-denied',url));
   const img=document.createElement('img');img.src=url;document.body.append(img);
   const link=document.createElement('link');link.rel='stylesheet';link.href=url;document.head.append(link);
   const object=document.createElement('object');object.data=url;document.body.append(object);
   const script=document.createElement('script');script.src=url;document.body.append(script);
   const frame=document.createElement('iframe');frame.src=url;document.body.append(frame);
  }
  emit('font-attempt','http://127.0.0.1:9/font.woff2');
  try{new FontFace('IntentgroveProbe','url(http://127.0.0.1:9/font.woff2)').load().then(()=>emit('font-unexpected',true),()=>emit('font-denied',true))}catch(e){emit('font-denied',String(e))}
  emit('form-attempt','http://127.0.0.1:9/form');const form=document.createElement('form');form.action='http://127.0.0.1:9/form';form.method='POST';document.body.append(form);form.submit();
  emit('download-attempt','http://127.0.0.1:9/download');const download=document.createElement('a');download.href='http://127.0.0.1:9/download';download.download='diagnostic.txt';document.body.append(download);download.click();
  emit('navigation-attempt','http://127.0.0.1:9/nav');const a=document.createElement('a');a.href='http://127.0.0.1:9/nav';a.click();
  emit('popup-attempt','http://127.0.0.1:9/popup');window.open('http://127.0.0.1:9/popup');
 }

}
export function parsedHook(){emit('parse-complete',true)}
