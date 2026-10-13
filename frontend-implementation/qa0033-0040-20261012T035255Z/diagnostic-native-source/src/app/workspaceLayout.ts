import type { Locale } from "./i18n";

export const workspaceLayouts = ["margin", "folio", "atlas"] as const;
export type WorkspaceLayout = typeof workspaceLayouts[number];
export function workspaceLayout(value: unknown): WorkspaceLayout {
  return workspaceLayouts.includes(value as WorkspaceLayout) ? value as WorkspaceLayout : "margin";
}
export const layoutCopy = (locale: Locale) => locale === "es" ? {
  label: "Distribución del espacio de trabajo",
  descriptions: ["Explorador persistente, documento central e índice de secciones.", "Página centrada, navegación contraída y espacio generoso.", "Estante horizontal del proyecto, índice y mesa de lectura."],
  unavailable: "Esta versión del sistema nativo aún no permite guardar la distribución. Margin permanece disponible."
} : {
  label: "Workspace layout",
  descriptions: ["Persistent explorer, central document and section outline.", "Centered reading page, collapsed navigation and generous spacing.", "Horizontal project shelf, outline and reading desk."],
  unavailable: "This native version cannot yet save workspace layouts. Margin remains available."
};
