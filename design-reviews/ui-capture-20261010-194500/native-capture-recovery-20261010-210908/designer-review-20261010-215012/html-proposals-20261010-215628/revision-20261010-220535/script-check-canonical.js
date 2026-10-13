
const prefix="revision-20261010-220535/assets/";
const names={"NR-003": "NR-003-wrapper-smoke-before", "NR-004": "NR-004-wrapper-smoke-projects-closed", "NV-001": "NV-001-projects-baseline-en-dark", "NV-002": "NV-002-search-settled-en-dark", "NV-004": "NV-004-search-result-focused-en-dark", "NV-005": "NV-005-search-later-result-en-dark", "NV-006": "NV-006-search-settled-es-light", "NV-007": "NV-007-search-later-result-es-light", "NV-008": "NV-008-short-header-tree-es-light", "NV-009": "NV-009-long-header-tree-es-light", "NV-010": "NV-010-full-name-disclosure-es-light", "NV-011": "NV-011-unsaved-dialog-es-light"};
function update(section){
 const which=section.dataset.case,locale=section.querySelector('.locale').value,state=section.querySelector('.state')?.value||'';
 let nativeId;
 if(which==='search') nativeId=locale==='es-light'?(state==='later'?'NV-007':'NV-006'):(state==='later'?'NV-005':'NV-002');
 else if(which==='identity') nativeId='NV-009';else nativeId='NV-011';
 const before=section.querySelector('.before'),after=section.querySelector('.after');
 before.src=prefix+'native-'+nativeId+'.png';before.alt='Accepted native reference '+names[nativeId];
 section.querySelector('.before-caption').textContent=names[nativeId]+' · accepted P-01 native capture.'+(locale==='en-dark'&&which!=='search'?' Spanish/light reference; English/dark proposal is a variant, not a controlled native comparison.':'')+(which==='search'&&state==='options'?' Settled reference; expanded menu is proposed.':'');
 after.src=prefix+which+(state?'-'+state:'')+'-'+locale+'.png';after.alt='Proposed '+which+' '+state+' '+locale+'; static design mockup, not implemented app';
}
document.querySelectorAll('[data-case]').forEach(s=>s.querySelectorAll('select').forEach(control=>control.addEventListener('change',()=>update(s))));
const dialog=document.querySelector('dialog'),image=document.getElementById('zoom-image'),title=document.getElementById('zoom-title');let opener;
document.querySelectorAll('.enlarge').forEach(b=>b.addEventListener('click',()=>{opener=b;const section=b.closest('[data-case]'),reference=section?.querySelector('.'+b.dataset.side);image.src=b.dataset.image||reference.src;image.alt=b.dataset.label||reference.alt;title.textContent=b.dataset.label||(b.dataset.side==='before'?'Before · accepted native original':'After · proposed design mockup');dialog.showModal();document.getElementById('close-zoom').focus()}));
document.getElementById('close-zoom').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>opener?.focus());
