// Executed inside a disposable WKWebView of the actual compiled frontend.
// Every native API is mocked by tests/fixtures/redesign-preview.tsx.
window.runFrontendChecks = async function(scenario) {
  const results = [];
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async predicate => {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await pause(30); }
    throw new Error('Timed out waiting for rendered state');
  };
  const check = (name, value, detail) => { results.push({name, status: value ? 'PASS' : 'FAIL', detail}); };
  const button = (selector, text) => [...document.querySelectorAll(selector)].find(node => node.textContent.trim() === text);
  const selected = () => document.querySelector('[role=tab][aria-selected=true]')?.textContent;
  const showSidebar = async () => {
    if (document.querySelector('.sidebar').dataset.open === 'false') { document.querySelector('.toolbar .icon-button').click(); await pause(30); }
  };
  const visit = async name => {
    await showSidebar();
    document.querySelector(`[data-tree-path='${JSON.stringify([name])}']`).click();
    await until(() => selected()?.includes(name) && (name.endsWith('.svg') ? document.querySelector('.image-viewport img') : document.querySelector('.document-page h1')));
    await pause(60);
  };
  const boxes = selector => [...document.querySelectorAll(selector)].map(node => {
    const rect = node.getBoundingClientRect(); return {x:rect.x,y:rect.y,w:rect.width,h:rect.height};
  });
  try {
    await until(() => document.querySelector('.document-page h1'));
    const arrows = boxes('.history-arrow'), initial = selected();
    check('Fixed D geometry', arrows.length === 2 && arrows.every(rect => rect.w === 32 && rect.h === 32), arrows);
    check('No document-header arrows', !document.querySelector('.document-location .history-arrow'));
    await visit('README.md');
    const back = document.querySelector('.history-arrow');
    back.click(); await until(() => selected() === initial);
    document.querySelectorAll('.history-arrow')[1].click(); await until(() => selected()?.includes('README.md'));
    check('Back/Forward activates files', selected()?.includes('README.md'));
    check('History placement stable', JSON.stringify(boxes('.history-arrow')) === JSON.stringify(arrows), boxes('.history-arrow'));
    await visit('AGENTS.md');
    const reader = document.querySelector('.reader-scroll'), chrome = boxes('.document-tabs');
    reader.scrollTop = 300; await pause(40);
    const target = [...document.querySelectorAll('.document-page p')].find(node => node.getBoundingClientRect().top >= reader.getBoundingClientRect().top);
    const point = target?.getBoundingClientRect() ?? reader.getBoundingClientRect();
    const before = target?.getBoundingClientRect().top;
    const picked = document.elementFromPoint(point.left+20,point.top+10);
    const diagnostic = {picked:picked?.tagName,closest:picked?.closest('p,li,h1,h2,h3,h4,h5,h6,pre,td,th')?.tagName,readerBefore:reader.scrollTop,point:[point.left+20,point.top+10],pickedRect:picked?.getBoundingClientRect().toJSON()};
    reader.dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:-60,bubbles:true,cancelable:true,clientX:point.left+20,clientY:point.top+10}));
    await pause(60);
    check('Document pinch zoom applied', Number(document.querySelector('[data-document-zoom]').dataset.documentZoom) > 1);
    check('Document pinch keeps chrome stable', JSON.stringify(boxes('.document-tabs')) === JSON.stringify(chrome));
    const probe = document.createElement("div"); probe.style.cssText="position:fixed;width:100px;height:1px;zoom:2;visibility:hidden"; document.body.append(probe);
    const multiplier = Math.abs(probe.getBoundingClientRect().width-100)<0.5 ? Number(document.querySelector("[data-document-zoom]").dataset.documentZoom) : 1; probe.remove();
    check('Document pinch preserves pointed passage', !target || Math.abs(target.getBoundingClientRect().top * multiplier - before) < 5, {before,after:target?.getBoundingClientRect().top,normalizedAfter:target?.getBoundingClientRect().top * multiplier,readerAfter:reader.scrollTop,pageRect:document.querySelector(".document-page").getBoundingClientRect().toJSON(),pageOffset:document.querySelector(".document-page").offsetWidth,pageClient:document.querySelector(".document-page").clientWidth,...diagnostic});
    const firstZoom = Number(document.querySelector('[data-document-zoom]').dataset.documentZoom);
    for (const deltaY of [-12,12,-12,12,-12,12]) {
      reader.dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY,bubbles:true,cancelable:true,clientX:point.left+20,clientY:point.top+10}));
      await pause(30);
    }
    check('Repeated zoom in/out remains reversible', Math.abs(Number(document.querySelector('[data-document-zoom]').dataset.documentZoom)-firstZoom)<0.00001);
    const retainedScroll = reader.scrollTop;
    await visit('README.md');
    check('Zoom isolated to its file', document.querySelector('[data-document-zoom]').dataset.documentZoom === '1');
    await visit('AGENTS.md');
    check('Document zoom restored', Number(document.querySelector('[data-document-zoom]').dataset.documentZoom) > 1);
    check('Document passage restored after switching', Math.abs(reader.scrollTop-retainedScroll)<5, {expected:retainedScroll,actual:reader.scrollTop});
    check('No false passage-shift notice', ![...document.querySelectorAll('.notice')].some(node => /The passage moved|El pasaje cambió/.test(node.textContent)));
    let falseAlerts = 0;
    const observer = new MutationObserver(() => { if (document.querySelector('.reader-scroll [role=alert]')) falseAlerts++; });
    observer.observe(reader,{childList:true,subtree:true});
    await visit('theme-states.svg');
    const viewport = document.querySelector('.image-viewport'), initialImageZoom = document.querySelector('.image-controls output')?.textContent;
    const gesture = (type, scale) => { const event = new Event(type,{bubbles:true,cancelable:true}); Object.assign(event,{scale,clientX:viewport.getBoundingClientRect().left+100,clientY:viewport.getBoundingClientRect().top+100}); viewport.dispatchEvent(event); };
    gesture('gesturestart',1); gesture('gesturechange',2); await pause(60); gesture('gesturechange',1.5); await pause(60); gesture('gestureend',1);
    const imageZoom = document.querySelector('.image-controls output')?.textContent;
    check('Image WebKit gesture changes zoom', Boolean(imageZoom) && imageZoom !== initialImageZoom, {before:initialImageZoom,after:imageZoom});
    await visit('README.md');
    document.querySelector('[role=tab][aria-label="theme-states.svg"]').click();
    await until(() => document.querySelector('.image-viewport img')); await pause(120);
    check('Image zoom survives file switch', document.querySelector('.image-controls output')?.textContent === imageZoom);
    observer.disconnect(); check('Successful image opens have no transient alert', falseAlerts === 0, falseAlerts);
    await visit('AGENTS.md');
    await showSidebar();
    const projects = document.querySelector('.projects-trigger'); projects.click(); await pause(30);
    const menu = document.querySelector('.action-menu'), rect = menu.getBoundingClientRect();
    check('Context menu is inside viewport', rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth+1 && rect.bottom <= innerHeight+1, {rect:rect.toJSON(),viewport:[innerWidth,innerHeight]});
    menu.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));
    check('Menu keyboard End', document.activeElement === [...menu.querySelectorAll('button:not(:disabled)')].at(-1));
    menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await pause(40);
    check('Menu Escape returns focus', !document.querySelector('.action-menu') && document.activeElement === projects);
    if (scenario === 'search') {
      projects.click(); await pause(20);
      document.querySelector('[role=menuitem][aria-label="Search folder"], [role=menuitem][aria-label="Buscar en la carpeta"]').click(); await pause(30);
      check('Scoped search focuses query', document.activeElement?.type === 'search');
    } else if (scenario === 'editing' || scenario === 'save-recovery') {
      [...document.querySelectorAll('.document-location-actions > button')].find(node => /Edit section|Editar sección/.test(node.textContent)).click(); await until(() => document.querySelector('.cm-editor'));
      if (scenario === 'save-recovery') window.__rendererFixture.failNext('checkpoint_section_edit');
      window.__rendererFixture.edit(); await pause(300);
      if (scenario === 'save-recovery') {
        await until(() => document.querySelector('.recovery-status[data-state=error]'));
        const save = button('.header-edit-actions button','Save file');
        check('Recovery failure leaves explicit original Save available', save && !save.disabled);
        document.querySelector('.section-editor-status button').click();
        await until(() => document.querySelector('.recovery-status[data-state=saved]'));
        check('Recovery Retry acknowledges current draft', true);
      }
      check('Explicit Save available', Boolean(button('.header-edit-actions button','Save file') ?? button('.header-edit-actions button','Guardar archivo')));
      await visit('README.md');
      document.querySelector('.history-arrow').click(); await until(() => selected()?.includes('AGENTS.md') && document.querySelector('.cm-editor'));
      check('Dirty history navigation preserves draft', document.querySelector('.cm-content')?.textContent.includes('Disposable renderer edit.') && (selected()?.includes('Unsaved') || selected()?.includes('Sin guardar')));
      if (scenario === 'save-recovery') {
        window.__rendererFixture.failNext('save_section_edit');
        button('.header-edit-actions button','Save file').click();
        await until(() => [...document.querySelectorAll('.notice')].some(node => node.textContent.includes('Save failed.')));
        check('Original Save failure preserves draft', Boolean(document.querySelector('.cm-content')?.textContent.includes('Disposable renderer edit.')));
        button('.header-edit-actions button','Save file').click();
        await until(() => !document.querySelector('.cm-editor'));
        check('Successful Save returns to reading after acknowledgment', !selected()?.includes('Unsaved') && document.querySelector('.document-page')?.textContent.includes('Disposable renderer edit.'));
      }
    } else if (scenario === 'reading-settings') {
      document.querySelector('[aria-controls="reading-settings-panel"]').click(); await pause(60);
      check('Existing reading controls still operable', Boolean(document.querySelector('#reading-settings-panel input[type=range]')));
    }
    if (scenario === 'reload') {
      const rowCount = document.querySelectorAll('.tree-row').length;
      const readerBox = document.querySelector('.reader-scroll').getBoundingClientRect().toJSON();
      const footer = document.querySelector('.reload-feedback-footer');
      const activeTab = document.querySelector('[role=tab][aria-selected=true]');
      activeTab.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true,cancelable:true})); await pause(30);
      check('Root-owned tab context includes batch close', Boolean(document.querySelector('[role=menuitem][aria-label="Close other tabs"], [role=menuitem][aria-label="Cerrar las otras pestañas"]')));
      [...document.querySelectorAll('[role=menuitem]')].find(node => /Reload AGENTS|Recargar AGENTS/.test(node.textContent)).click();
      await until(() => footer.textContent.includes('Already current') || footer.textContent.includes('Ya está actualizado'));
      const probe = document.createElement('span'); probe.style.color='var(--muted)'; footer.append(probe);
      const neutral = getComputedStyle(probe).color === getComputedStyle(footer).color; probe.remove();
      check('Manual success is neutral and target named', neutral && footer.textContent.includes('✓') && footer.textContent.includes('AGENTS.md'), {color:getComputedStyle(footer).color,text:footer.textContent});
      await until(() => !footer.querySelector('.reload-progress'));
      check('Reload does not add tree rows or move reader', document.querySelectorAll('.tree-row').length === rowCount && JSON.stringify(document.querySelector('.reader-scroll').getBoundingClientRect().toJSON()) === JSON.stringify(readerBox), {before:readerBox,after:document.querySelector('.reader-scroll').getBoundingClientRect().toJSON()});
      footer.dispatchEvent(new MouseEvent('mouseover', {bubbles:true,relatedTarget:document.body})); await pause(5200);
      check('Hovered success stays visible', Boolean(footer.querySelector(':scope > [role=status]')));
      footer.querySelector('button').click(); await pause(30);
      check('Dismiss keeps reserved footer space', !footer.querySelector(':scope > [role=status]') && footer.getBoundingClientRect().height >= 40);
      activeTab.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true,cancelable:true})); await pause(30);
      check('Target menu retains last reload result', document.querySelector('.action-menu')?.textContent.includes('Already current') || document.querySelector('.action-menu')?.textContent.includes('Ya está actualizado'));
      [...document.querySelectorAll('[role=menuitem]')].find(node => /Reload AGENTS|Recargar AGENTS/.test(node.textContent)).click();
      await until(() => footer.querySelector(':scope > [role=status]')?.textContent.includes('✓'));
      check('Repeated manual reload shows a new success', Boolean(footer.querySelector(':scope > [role=status]')));
    }
    if (scenario !== 'search') document.querySelector('.sidebar-scrim')?.click();
    await pause(80);
    check('No whole-window horizontal overflow', document.documentElement.scrollWidth <= innerWidth+1, {scrollWidth:document.documentElement.scrollWidth,innerWidth});
    check('D remains in viewport', boxes('.history-arrow').every(rect => rect.x >= 0 && rect.x+rect.w <= innerWidth && rect.y >= 0 && rect.y+rect.h <= innerHeight), boxes('.history-arrow'));
    return JSON.stringify({kind:'macOS WKWebView renderer, native API mocked; gestures synthetic',theme:document.querySelector('.appearance-control select').value,locale:document.documentElement.lang,viewport:[innerWidth,innerHeight],scenario,results});
  } catch(error) { return JSON.stringify({kind:'macOS WKWebView renderer, native API mocked',results,error:String(error)}); }
};
