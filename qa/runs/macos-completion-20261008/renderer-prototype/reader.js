import mermaid from 'mermaid';
mermaid.initialize({startOnLoad:false,securityLevel:'strict',suppressErrorRendering:true,theme:'neutral',maxTextSize:32768,maxEdges:512,htmlLabels:false,flowchart:{htmlLabels:false,useMaxWidth:false},sequence:{useMaxWidth:false},deterministicIds:true});
window.runDiagram=async request=>{
 const send=value=>window.webkit.messageHandlers.result.postMessage({...value,token:request.token,jobId:request.jobId,generation:request.generation});
 if(request.probe){send({probe:true,tauri:!!window.__TAURI_INTERNALS__,handlers:Object.keys(window.webkit.messageHandlers),origin:location.origin});return;}
 if(request.busy){const until=performance.now()+5000;while(performance.now()<until){}send({error:'busy completed'});return;}
 try{
  const source=request.source;
  if(typeof source!=='string'||new TextEncoder().encode(source).length>32768||!/^(?:flowchart|graph)\s+(?:TB|TD|BT|RL|LR)\b|^sequenceDiagram\b/.test(source.trim())||/%%|^\s*---|<|\b(?:click|style|classDef|linkStyle|href|callback|init|config)\b|\$\$/im.test(source))throw Error('source rejected');
  const {svg}=await mermaid.render('diagram',source);
  if(svg.length>1048576)throw Error('svg output limit');
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  if(doc.querySelector('parsererror,script,foreignObject,a,image,iframe,object,embed')||doc.querySelectorAll('*').length>8192)throw Error('unsafe or large svg');
  for(const e of doc.querySelectorAll('*'))for(const a of e.attributes)if(/^on/i.test(a.name)||((/href$/i.test(a.name))&&!a.value.startsWith('#'))||/url\(\s*['"]?(?!#)/i.test(a.value))throw Error('active svg');
  document.getElementById('canvas').innerHTML=svg;
  const diagram=document.querySelector('svg');const rect=diagram.getBoundingClientRect();
  const width=Math.ceil(rect.width),height=Math.ceil(rect.height);if(!width||!height||width>2048||height>2048)throw Error('pixel limit');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));send({width,height});
 }catch(error){send({error:'invalid'});}
};
