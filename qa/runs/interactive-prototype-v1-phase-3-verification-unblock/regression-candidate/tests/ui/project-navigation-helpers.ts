import { fireEvent, within } from "@testing-library/react";

// Use the replacement entry point rather than the removed global toolbar.
export function projectsToggle() {
  return document.querySelector<HTMLButtonElement>(".projects-toggle")!;
}
export function projectAction(name: string) {
  const sidebar = document.querySelector<HTMLElement>(".sidebar")!;
  if (sidebar.getAttribute("aria-hidden") === "true") fireEvent.click(projectsToggle());
  return within(sidebar).getByRole("button", { name });
}
export function projectsMenu() {
  const sidebar = document.querySelector<HTMLElement>(".sidebar")!;
  if (sidebar.getAttribute("aria-hidden") === "true") fireEvent.click(projectsToggle());
  return within(sidebar).getByRole("button", { name: "Projects" });
}
