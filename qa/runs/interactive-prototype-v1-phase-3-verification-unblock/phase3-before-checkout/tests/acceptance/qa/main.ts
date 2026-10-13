import { startBridge } from './bridge';
import { startAcceptanceUI } from './bootstrap';
if (import.meta.env.VITE_QA_SETTINGS_ACCEPTANCE === '1') {
  await startAcceptanceUI(location.search, startBridge, () => import('../../../src/main'));
  const probe=await import('../settings/runtime');
  if(new URLSearchParams(location.search).has('settings')) void probe.runSettingsProbe();
  else void probe.observeReaderProbe();
} else if ((window as unknown as {__F002A_FAULT:string}).__F002A_FAULT === 'diagram-acceptance') {
  await startBridge();
  await (await import('../diagram/webview-acceptance')).run();
} else await startAcceptanceUI(location.search, startBridge, () => import('../../../src/main'));
