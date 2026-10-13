import PreviewLoading from "../reader/PreviewLoading";
import type { SafetyCopyInventory } from "./api";
import { t, type Locale } from "./i18n";
import WorkspaceDialog from "./WorkspaceDialog";

export default function StorageManagement({ locale, inventory, loading, busy, cleanupPending = false, suspended, exclusions, onClose,
  onRetry, onSession, onRecents, onDrafts, onCopies, recentsEmpty }:
  { locale: Locale; inventory: SafetyCopyInventory | null; loading: boolean; busy: boolean; cleanupPending?: boolean; suspended: boolean;
    exclusions: boolean; recentsEmpty: boolean; onClose: () => void; onRetry: () => void;
    onSession: () => void; onRecents: () => void; onDrafts: () => void; onCopies: () => void }) {
  const size = (bytes: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024) + " KiB";
  return <WorkspaceDialog title={t(locale, "storageManagement")} closeLabel={t(locale, "closeSurface")}
    suspended={suspended} onClose={onClose}>
    <p>{t(locale, "draftStorage")}</p><p>{t(locale, "rememberWorkspace")}</p>
    {exclusions && <details><summary>{t(locale, "excluded")}</summary><p>{t(locale, "localOnly")}</p></details>}
    <div role="status">{loading ? <PreviewLoading inline label={t(locale, "checking")} announce={false} /> : inventory
      ? `${t(locale, "resolvedCopies")}: ${inventory.resolvedCount} (${size(inventory.resolvedBytes)}) · ${t(locale, "unresolvedCopies")}: ${inventory.unresolvedCount} (${size(inventory.unresolvedBytes)})`
      : t(locale, "storageUnknown")}</div>
    {inventory && inventory.unresolvedCount > 0 && <p>{t(locale, "backupReviewDeferred")}</p>}
    <button type="button" disabled={loading || busy} onClick={onRetry}>{t(locale, "retry")}</button>
    <div className="storage-rows">
      <section><h3>{t(locale, "clearSession")}</h3><p>{t(locale, "sessionScopeDetail")}</p>
        <button type="button" disabled={busy} onClick={onSession}>{t(locale, "clearSessionScope")}</button></section>
      <section><h3>{t(locale, "clearRecents")}</h3><p>{t(locale, "clearRecentsDetail")}</p>
        <button type="button" disabled={busy || recentsEmpty} onClick={onRecents}>{t(locale, "clearRecents")}</button></section>
      <section><h3>{t(locale, "clearDrafts")}</h3><p>{t(locale, "clearDraftsDetail")}</p>
        <button type="button" disabled={busy} onClick={onDrafts}>{t(locale, "clearDraftsScope")}</button></section>
      <section><h3>{t(locale, "clearSafetyCopies")}</h3><p>{t(locale, "clearSafetyCopiesDetail")}</p>
        <button type="button" disabled={busy || loading || !inventory?.resolvedCount} onClick={onCopies}>{t(locale, "clearSafetyCopies")}</button></section>
    </div>
    {cleanupPending && !suspended && <p role="status">{t(locale, "cleanupBusy")}</p>}
  </WorkspaceDialog>;
}
