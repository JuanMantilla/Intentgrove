import mermaid from 'mermaid';
mermaid.initialize({startOnLoad:false,securityLevel:'strict',suppressErrorRendering:true,theme:'neutral',maxTextSize:32768,maxEdges:512,htmlLabels:false,flowchart:{htmlLabels:false,useMaxWidth:false},sequence:{useMaxWidth:false},deterministicIds:true});
window.runDiagram=async request=>{
 const send=value=>window.__diagramReply={...value,token:request.token,jobId:request.jobId,generation:request.generation,sourceDigest:request.sourceDigest};
 try{
  const source=request.source;
  if(typeof source!=='string'||new TextEncoder().encode(source).length>32768||!/^(?:flowchart|graph)\s+(?:TB|TD|BT|RL|LR)\b|^sequenceDiagram\b/.test(source.trim())||/%%|^\s*---|<|\b(?:click|style|classDef|linkStyle|href|callback|init|config)\b|\$\$/im.test(source))throw Error('source rejected');
  if((source.match(/[-=.]{2,}[>|]|--|->>|->/g)?.length??0)>512)throw Error('graph limit');
  const parsed=await mermaid.mermaidAPI.getDiagramFromText(source);const nodes=parsed.db.getVertices?.().size??parsed.db.getActors?.().size;const edges=parsed.db.getEdges?.().length??parsed.db.getMessages?.().length;if(!Number.isInteger(nodes)||!Number.isInteger(edges)||nodes>256||edges>512)throw Error('graph limit');
  const {svg}=await mermaid.render('diagram',source);
  if(svg.length>1048576)throw Error('svg output limit');
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  if(doc.querySelector('parsererror,script,foreignObject,a,image,iframe,object,embed')||doc.querySelectorAll('*').length>8192)throw Error('unsafe or large svg');
  for(const e of doc.querySelectorAll('*'))for(const a of e.attributes)if(/^on/i.test(a.name)||((/href$/i.test(a.name))&&!a.value.startsWith('#'))||/url\(\s*['"]?(?!#)/i.test(a.value))throw Error('active svg');
  document.getElementById('canvas').innerHTML=svg;
  const diagram=document.querySelector('svg');const rect=diagram.getBoundingClientRect();
  const width=Math.ceil(rect.width),height=Math.ceil(rect.height);if(!width||!height||width>2048||height>2048)throw Error('pixel limit');
  send({width,height,svg});
 }catch(error){send({error:String(error).slice(0,200)});}
};
