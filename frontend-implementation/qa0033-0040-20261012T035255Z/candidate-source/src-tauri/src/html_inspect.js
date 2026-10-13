// Executed only by native app in WKContentWorld.defaultClientWorld. No message handler.
// Disable controls that could invoke native pickers or submission UI.
for(const e of document.querySelectorAll('input[type=file],button,input[type=submit],input[type=image]'))e.disabled=true;
const visible = e => {const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&e.getClientRects().length>0&&!e.closest('script,style,template,noscript,head,[hidden]');};
const location = () => {
 const hs=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
 const h=hs.filter(e=>e.getBoundingClientRect().top<=32).at(-1);
 return {headingId:h?.id||null,offset:h?-h.getBoundingClientRect().top:0,scrollTop:scrollY,scrollLeft:scrollX,zoom:1};
};
if(op==='location') {
 const z=args.zoom; // Native magnification owns zoom; CSS stays authored.
 let e=null;
 if(args.headingId!==null && args.headingId!=='') {
   e=document.getElementById(args.headingId);
   if(!e) {const index=Number(String(args.headingId).replace(/^ig-heading-/,''));if(Number.isInteger(index))e=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible)[index];}
   if(!e || !visible(e))return {error:'anchor_missing',location:location()};
 }
 if(e){e.scrollIntoView();scrollBy(0,args.offset);}
 else scrollTo(args.scrollLeft,Math.max(0,args.scrollTop));
 return {location:location()};
}
if(op==='find') {
 const q=String(args.query).toLocaleLowerCase();
 if(!q){getSelection()?.removeAllRanges();return {count:0,current:0,location:location()};}
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let node,units=0,visited=0;const spans=[];let text='';
 while((node=walker.nextNode())) {
   if(++visited>100000)return {error:'html_limit'};
   if(!node.parentElement||!visible(node.parentElement))continue;
   const chunk=node.textContent||'';units+=chunk.length;
   if(units>2*1024*1024)return {error:'html_limit'};
   spans.push({node,start:text.length,end:text.length+chunk.length});text+=chunk;
 }
 const spanAt=(offset,inclusive)=>{let lo=0,hi=spans.length;while(lo<hi){const mid=(lo+hi)>>>1;if(inclusive?spans[mid].end>=offset:spans[mid].end>offset)hi=mid;else lo=mid+1;}return spans[lo];};
 const escaped=String(args.query).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const regex=new RegExp(escaped,'giu');const matches=[];let found;
 while((found=regex.exec(text))!==null) {
   const start=found.index,end=start+found[0].length;
   const a=spanAt(start,false),b=spanAt(end,true);
   if(a&&b)matches.push([a.node,start-a.start,b.node,end-b.start]);
   if(matches.length>=10000)return {error:'html_limit'};
 }
 // State belongs to the app content world; authored JS never executes.
 const prior=globalThis.__igFind;
 let i=prior?.q===q?prior.i+(args.backwards?-1:1):(args.backwards?matches.length-1:0);
 i=matches.length?((i%matches.length)+matches.length)%matches.length:0;
 globalThis.__igFind={q,i};
 if(matches.length){const [n,a,endNode,b]=matches[i];const r=document.createRange();r.setStart(n,a);r.setEnd(endNode,b);const s=getSelection();s.removeAllRanges();s.addRange(r);n.parentElement.scrollIntoView({block:'center'});}
 return {count:matches.length,current:matches.length?i+1:0,location:location()};
}
const headings=[];let index=0;
for(const e of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
 if(index>=1000)break;if(!visible(e))continue;
 headings.push({key:e.id||`ig-heading-${index}`,authoredId:e.id||null,level:Number(e.tagName[1]),text:e.innerText.slice(0,2048)});index++;
}
const text=document.body?.innerText||'';
return {headings,location:location(),empty:!text.trim()&&!document.querySelector('img'),textLimit:text.length>2*1024*1024};
