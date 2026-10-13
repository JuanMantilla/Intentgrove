/** Decorative field affordance; the native select remains the only focus target. */
export default function SelectChevron() {
  return <svg className="select-chevron" width="12" height="7" viewBox="0 0 12 7" aria-hidden="true">
    <path d="M1 1 L6 6 L11 1" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
