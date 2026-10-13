// Fixed trusted host code, evaluated only in WKContentWorld.defaultClientWorld.
(() => {
  let pkg, scene, history, overlays, local, trace, busy=false;
  const surface=document.createElement('div');surface.id='prototype-surface';
  document.body.replaceChildren(surface);
  const style=document.createElement('style');style.textContent=`html,body{margin:0;width:390px;height:844px;overflow:hidden;background:#f3f5fb}#prototype-surface{position:relative;width:390px;height:844px}svg{display:block;width:390px;height:844px}.overlay{position:absolute;inset:0;box-shadow:0 0 0 1px #0003}.overlay svg{transform:translate(19.5px,42.2px) scale(.9);transform-origin:0 0;border-radius:20px;box-shadow:0 8px 24px #0005}.shade{position:absolute;inset:0;background:#1118}`;
  document.head.append(style);
  const inspect=()=>({scene,history:[...history],overlays:[...overlays],local:{...local},targets:[...surface.querySelectorAll('[data-prototype-id]')].map(e=>({scene:e.closest('[data-scene]').dataset.scene,id:e.dataset.prototypeId,visible:e.getBoundingClientRect().width>0&&getComputedStyle(e).display!=='none'})),trace:[...trace],busy});
  function svg(name){
    const doc=new DOMParser().parseFromString(pkg.scenes[name],'image/svg+xml');
    if(doc.querySelector('parsererror'))throw Error('invalid SVG');
    const root=document.importNode(doc.documentElement,true);
    for(const e of root.querySelectorAll('image'))for(const a of [...e.attributes])if(a.localName==='href'&&!a.value.startsWith('#'))e.setAttributeNS(a.namespaceURI,a.name,`ig-html://poc/${a.value}`);
    for(const e of root.querySelectorAll('[data-prototype-id]')){const key=name+'/'+e.dataset.prototypeId;if(key in local)e.style.display=local[key]?'inline':'none';}
    return root;
  }
  function render(){
    surface.replaceChildren();const base=document.createElement('div');base.dataset.scene=scene;base.append(svg(scene));surface.append(base);
    for(const name of overlays){const shade=document.createElement('div');shade.className='shade';surface.append(shade);const layer=document.createElement('div');layer.className='overlay';layer.dataset.scene=name;layer.append(svg(name));surface.append(layer);}
  }
  async function execute(i){
    const a=i.action;
    if(a.type==='NAVIGATE'){if(history.length>=32)throw Error('history limit');history.push(scene);scene=a.scene;overlays=[];}
    if(a.type==='BACK'){if(history.length)scene=history.pop();overlays=[];}
    if(a.type==='OPEN_OVERLAY'){if(overlays.length>=8)throw Error('overlay limit');overlays.push(a.scene);}
    if(a.type==='CLOSE_OVERLAY')overlays.pop();
    if(a.type==='TOGGLE'){const key=i.scene+'/'+a.target;const e=[...surface.querySelectorAll('[data-prototype-id]')].find(e=>e.closest('[data-scene]').dataset.scene===i.scene&&e.dataset.prototypeId===a.target);local[key]=!(key in local?local[key]:getComputedStyle(e).display!=='none');}
    render();
    if(i.transition==='DISSOLVE'){const animation=surface.animate([{opacity:0},{opacity:1}],{duration:100,easing:'linear'});trace.push({transition:'DISSOLVE',duration:100});await animation.finished;}
  }
  surface.addEventListener('click',async e=>{
    if(busy)return;
    const target=e.target.closest('[data-prototype-id]');if(!target)return;
    const current=target.closest('[data-scene]').dataset.scene;
    if(current!==(overlays.at(-1)||scene))return;
    const i=pkg.graph.interactions.find(i=>i.scene===current&&i.target===target.dataset.prototypeId&&i.trigger==='CLICK');
    trace.push({scene:current,target:target.dataset.prototypeId,trigger:'CLICK',isTrusted:e.isTrusted,x:e.clientX,y:e.clientY});
    if(i){busy=true;const start=performance.now();try{await execute(i);trace.push({action:i.action.type,actionMs:performance.now()-start});}catch(error){trace.push({error:String(error)});}finally{busy=false;}}
  });
  window.prototype={
    open(data){pkg=data;return this.reset();},
    reset(){scene=pkg.graph.entry;history=[];overlays=[];local={};trace=[];busy=false;render();return inspect();},
    current_scene(){return scene;},inspect,
    // Returns actual target geometry; native controller sends NSEvents through WebKit.
    click(name,id){
      if(name!==(overlays.at(-1)||scene))throw Error('inactive scene');
      const target=[...surface.querySelectorAll('[data-prototype-id]')].find(e=>e.closest('[data-scene]').dataset.scene===name&&e.dataset.prototypeId===id);
      if(!target)throw Error('missing target');const r=target.getBoundingClientRect();
      if(!r.width||!r.height)throw Error('hidden target');
      const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y)?.closest('[data-prototype-id]');
      if(hit!==target)throw Error('target occluded');return {x,y};
    }
  };
  return {installed:true,bridge:typeof window.__TAURI_INTERNALS__,pageScript:window.packageScriptExecuted===true};
})()
