/** Settings keeps its preference-only capability boundary in QA builds. */
export async function startAcceptanceUI(search: string, startBridge: () => Promise<unknown>, mount: () => Promise<unknown>) {
  if (!new URLSearchParams(search).has("settings")) await startBridge();
  await mount();
}
