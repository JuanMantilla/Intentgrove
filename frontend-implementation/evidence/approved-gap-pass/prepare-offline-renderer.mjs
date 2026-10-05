// Uses installed Vite only. No production configuration or native contracts change.
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
const output = '/private/tmp/md-approved-gap-renderer';
await build({configFile:false,root:process.cwd(),base:'./',build:{outDir:output,emptyOutDir:true,
  rolldownOptions:{input:'tests/fixtures/redesign-preview.html',output:{codeSplitting:false}}}});
let html = fs.readFileSync(output+'/tests/fixtures/redesign-preview.html','utf8');
html = html.replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g, (_, name) =>
  '<script type="module">'+fs.readFileSync(path.resolve(output+'/tests/fixtures',name),'utf8').replaceAll('</script','<\\/script')+'</script>');
html = html.replace(/<link[^>]+href="([^"]+\.css)"[^>]*>/g, (_, name) =>
  '<style>'+fs.readFileSync(path.resolve(output+'/tests/fixtures',name),'utf8').replaceAll('url(./','url(assets/')+'</style>');
const driver = fs.readFileSync('frontend-implementation/evidence/approved-gap-pass/offline-interactions.js','utf8');
html = html.replace('</body>', '<script>'+driver+'</script></body>');
const cases = [
  {name:'dark-en-reload',width:1440,height:900,zoom:1,theme:'dark',locale:'en',scenario:'reload'},
  {name:'light-es-narrow-reload',width:640,height:480,zoom:1,theme:'light',locale:'es',scenario:'reload'},
  {name:'dark-en-reading',width:1440,height:900,zoom:1,theme:'dark',locale:'en',scenario:'reading'},
  {name:'light-es-reading',width:1440,height:900,zoom:1,theme:'light',locale:'es',scenario:'reading'},
  {name:'dark-es-narrow-editing',width:640,height:480,zoom:1,theme:'dark',locale:'es',scenario:'editing'},
  {name:'light-en-narrow-search',width:640,height:480,zoom:1,theme:'light',locale:'en',scenario:'search'},
  {name:'light-es-enlarged-reading',width:1440,height:900,zoom:2,theme:'light',locale:'es',scenario:'reading'},
  {name:'dark-en-reading-controls',width:1440,height:900,zoom:1,theme:'dark',locale:'en',scenario:'reading-settings'},
  {name:'light-en-save-recovery',width:1280,height:800,zoom:1,theme:'light',locale:'en',scenario:'save-recovery'}
];
for (const item of cases) {
  item.html = output+'/'+item.name+'.html';
  fs.writeFileSync(item.html,html.replace('new URLSearchParams(location.search)',`new URLSearchParams("theme=${item.theme}&locale=${item.locale}")`));
}
fs.writeFileSync('/private/tmp/md-approved-gap-webkit/cases.json',JSON.stringify(cases,null,2));
