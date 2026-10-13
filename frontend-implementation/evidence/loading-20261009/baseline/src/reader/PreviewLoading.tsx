export default function PreviewLoading({ label, inline = false }: { label: string; inline?: boolean }) {
  return <span className={`preview-loading${inline ? " preview-loading-inline" : ""}`} role="status" aria-label={label}>
    <span className="sr-only">{label}</span>
    <span className="preview-loading-dots" aria-hidden="true"><i /><i /><i /></span>
  </span>;
}
