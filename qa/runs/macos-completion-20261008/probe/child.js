const send=x=>parent.postMessage(x,'*');
send({stage:'executed',origin:location.origin,tauri:!!window.__TAURI_INTERNALS__,ipc:typeof window.ipc,webkit:!!window.webkit?.messageHandlers});
addEventListener('securitypolicyviolation',e=>send({stage:'child-csp',directive:e.effectiveDirective,blocked:e.blockedURI}));
try{send({stage:'parent-read',result:parent.document.body.textContent})}catch(e){send({stage:'parent-read',denied:String(e)})}
try{window.webkit.messageHandlers.ipc.postMessage({cmd:'intentgrove_invalid_probe_no_side_effect',callback:1,error:2});send({stage:'direct-native',result:'posted; native refusal not yet established'})}catch(e){send({stage:'direct-native',denied:String(e)})}
fetch('http://127.0.0.1:9/intentgrove-disposable-probe').then(()=>send({stage:'network',result:'unexpected-success'}),e=>send({stage:'network',denied:String(e)}));
for(const src of ['file:///private/tmp/intentgrove-disposable-sentinel','https://example.invalid/probe.png','tauri://localhost/index.html']){const img=new Image;img.onload=()=>send({stage:'image',src,result:'loaded'});img.onerror=()=>send({stage:'image',src,result:'denied'});img.src=src}
addEventListener('message',e=>{if(e.data?.stage==='context'){send({stage:'context',...e.data});return}if(e.data?.stage==='busy'){send({stage:'busy-entered',utc:new Date().toISOString()});const until=performance.now()+5000;while(performance.now()<until){}send({stage:'busy-completed',utc:new Date().toISOString()})}});
