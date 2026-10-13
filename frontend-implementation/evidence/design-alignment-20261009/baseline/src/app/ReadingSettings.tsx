import { useLayoutEffect, useId, useState, type CSSProperties } from "react";
import type { SessionPanel } from "./api";
import { t, type Locale } from "./i18n";
import { defaultSessionPanel } from "./session";

export type ReadingPreferences = Pick<SessionPanel,
  "readingFont" | "readingSize" | "readingLineHeight" | "readingWidth">;

function ReadingNumber({ locale, label, value, min, max, step, unit, onChange }: {
  locale: Locale; label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (value: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  useLayoutEffect(() => { setDraft(String(value)); setInvalid(false); }, [value]);
  function commit() {
    // Merely focusing a restored value must not normalize or reject it.
    if (draft === String(value)) { setInvalid(false); return; }
    const next = draft.trim() === "" ? NaN : Number(draft);
    if (!Number.isFinite(next) || next < min || next > max) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }
  return <div className="reading-number">
    <label htmlFor={`${id}-number`}>{label}{unit && ` (${unit})`}</label>
    <div className="reading-number-controls">
      <input id={`${id}-slider`} aria-label={label} type="range" min={min} max={max} step={step}
        value={value} onChange={event => {
          const next = Number(event.target.value);
          setDraft(String(next)); setInvalid(false); onChange(next);
        }} />
      <input id={`${id}-number`} type="number" min={min} max={max} step={step} value={draft}
        aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={event => { setDraft(event.target.value); setInvalid(false); }} onBlur={commit}
        onKeyDown={event => {
          if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); commit(); }
          if (event.key === "Escape" && (draft !== String(value) || invalid)) {
            event.preventDefault(); event.stopPropagation(); setDraft(String(value)); setInvalid(false);
          }
        }} />
    </div>
    {invalid && <span id={`${id}-error`} className="reading-value-error" role="alert">
      {t(locale, "readingValueRange")} {min}–{max}{unit && ` ${unit}`}.
    </span>}
  </div>;
}

export default function ReadingSettings({ locale, value, onChange }: {
  locale: Locale; value: ReadingPreferences; onChange: (value: ReadingPreferences) => void;
}) {
  const previewStyle = { "--reading-size": `${value.readingSize}px`,
    "--reading-line-height": value.readingLineHeight,
    maxWidth: value.readingWidth } as CSSProperties;
  return <div className="reading-settings-fields">
    <label>{t(locale, "readingFont")}
      <select value={value.readingFont} onChange={event => onChange({
        ...value, readingFont: event.target.value as ReadingPreferences["readingFont"] })}>
        <option value="roboto">Roboto</option><option value="serif">{t(locale, "systemSerif")}</option>
        <option value="sans">{t(locale, "systemSans")}</option>
        <option value="mono">{t(locale, "systemMono")}</option>
      </select>
    </label>
    <ReadingNumber locale={locale} label={t(locale, "readingSize")} value={value.readingSize}
      min={12} max={24} step={1} unit="px" onChange={readingSize => onChange({ ...value, readingSize })} />
    <ReadingNumber locale={locale} label={t(locale, "readingLineHeight")} value={value.readingLineHeight}
      min={1.3} max={2.2} step={0.1} onChange={readingLineHeight => onChange({ ...value, readingLineHeight })} />
    <ReadingNumber locale={locale} label={t(locale, "readingWidth")} value={value.readingWidth}
      min={480} max={1200} step={20} unit="px" onChange={readingWidth => onChange({ ...value, readingWidth })} />
    <div className="reading-width-presets" aria-label={t(locale, "readingWidth")}>
      <button type="button" aria-pressed={value.readingWidth === 760}
        onClick={() => onChange({ ...value, readingWidth: 760 })}>{t(locale, "comfortableWidth")}</button>
      <button type="button" aria-pressed={value.readingWidth === 1200}
        onClick={() => onChange({ ...value, readingWidth: 1200 })}>{t(locale, "wideWidth")}</button>
      {![760, 1200].includes(value.readingWidth) && <span>{t(locale, "customWidth")}</span>}
    </div>
    <section className="reading-preview" aria-label={t(locale, "readingPreview")}>
      <strong>{t(locale, "readingPreview")}</strong>
      <p className={`reading-preview-text reading-font-${value.readingFont}`} style={previewStyle}>
        {t(locale, "readingPreviewText")}
      </p>
    </section>
    <button type="button" onClick={() => onChange({ readingFont: defaultSessionPanel.readingFont,
      readingSize: defaultSessionPanel.readingSize, readingLineHeight: defaultSessionPanel.readingLineHeight,
      readingWidth: defaultSessionPanel.readingWidth })}>{t(locale, "resetReading")}</button>
  </div>;
}
