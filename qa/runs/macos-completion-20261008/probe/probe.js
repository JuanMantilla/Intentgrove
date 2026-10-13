const out=document.getElementById('results');
const record=value=>{out.textContent+=JSON.stringify({utc:new Date().toISOString(),...value})+'\n'};
record({stage:'parent',origin:location.origin,bridge:!!window.__TAURI_INTERNALS__});
window.addEventListener('securitypolicyviolation',e=>record({stage:'parent-csp',directive:e.effectiveDirective,blocked:e.blockedURI}));
const nonce=crypto.randomUUID().replaceAll('-','');let generation=1;let executed=false;let frame;
function create(inline=false){
 frame=document.createElement('iframe');frame.sandbox='allow-scripts';
 const script=inline?`<script nonce="${nonce}">parent.postMessage({stage:'inline-executed'},'*')<\/script>`:`<script nonce="${nonce}" src="tauri://localhost/child.js"><\/script>`;
 const html=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'none'; img-src 'none'; font-src 'none'; style-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'">${script}`;
 const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));frame.src=url;document.body.append(frame);record({stage:'created',inline,generation,nonce,url});setTimeout(()=>URL.revokeObjectURL(url),5000);
}
window.addEventListener('message',e=>{
 record({stage:'received',sourceMatches:e.source===frame?.contentWindow,origin:e.origin,data:e.data});
 if(e.source===frame?.contentWindow&&e.data?.stage==='executed'){executed=true;frame.contentWindow.postMessage({stage:'context',nonce,generation},'*')}
});
create();
setTimeout(()=>record({stage:'execution-check',executed,generation}),1500);
document.getElementById('busy').onclick=()=>{
 if(!executed){record({stage:'busy-refused',reason:'child execution absent'});return}
 const started=performance.now();frame.contentWindow.postMessage({stage:'busy',nonce,generation},'*');record({stage:'busy-request',deadlineMs:1000});
 setTimeout(()=>{frame.remove();record({stage:'parent-deadline',elapsedMs:performance.now()-started,removed:!frame.isConnected});generation++},1000);
};
