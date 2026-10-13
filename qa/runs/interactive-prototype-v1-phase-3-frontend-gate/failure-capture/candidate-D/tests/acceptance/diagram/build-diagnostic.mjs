import {build} from 'rolldown';
import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync('src-tauri/diagram/reader.js','utf8');
for(const anchor of [' const send=value','const nodes=parsed.db'])if(source.split(anchor).length!==2)throw Error('reader instrumentation anchor changed');
const transformed="import {setup,parsedHook} from '../../../tests/acceptance/diagram/diagnostics.js';\n"+source.replace(' const send=value',' setup(request);\n const send=value').replace('const nodes=parsed.db','parsedHook(parsed);const nodes=parsed.db');
writeFileSync('src-tauri/target/diagram-diagnostic/reader.js',transformed);
await build({input:'src-tauri/target/diagram-diagnostic/reader.js',plugins:[{
 name:'observe-real-mermaid-entry',transform(code,id){
  if(id.endsWith('/chunk-SHT3W25Y.mjs')){
   const anchor='      lexer2.setInput(input, sharedState.yy);';
   if(code.split(anchor).length!==2)throw Error('flow parser entry anchor changed');
   code=code.replace(anchor,anchor+` alert('INTENTGROVE_DIAG:'+JSON.stringify({kind:'parse-entered',value:true})); if(window.__diagMode==='busy-parse')while(true){};`);
   const renderAnchor='  const data4Layout = diag.db.getData();';
   if(code.split(renderAnchor).length!==2)throw Error('flow renderer anchor changed');
   return code.replace(renderAnchor,renderAnchor+` alert('INTENTGROVE_DIAG:'+JSON.stringify({kind:'render-entered',value:true})); if(window.__diagMode==='busy-render')while(true){};`);
  }
 }
}],output:{file:'src-tauri/target/diagram-diagnostic/DiagramRenderer.app/Contents/Resources/reader.bundle.js',format:'iife'}});
