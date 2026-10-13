// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { SectionDescriptor } from "../../src/app/api";
import MarkdownView from "../../src/reader/MarkdownView";

afterEach(cleanup);

function section(id: string, startByte: number, endByte: number, ordinal: number): SectionDescriptor {
  return { id, kind: "heading", ordinal, level: 1, label: id,
    startByte, endByte, sourceHash: id };
}

describe("section context editing", () => {
  const content = "# One\nalpha\n# Two\nbeta\n# Three\ngamma\n";
  const two = new TextEncoder().encode("# One\nalpha\n").length;
  const three = new TextEncoder().encode("# One\nalpha\n# Two\nbeta\n").length;
  const sections = [
    section("one", 0, two, 0),
    section("two", two, three, 1),
    section("three", three, new TextEncoder().encode(content).length, 2)
  ];

  it("right-clicks body text and targets only its owning section", async () => {
    const edit = vi.fn();
    render(<MarkdownView content={content} fileId="f" locale="en"
      sections={sections} onEditSection={edit} onNavigate={() => {}} />);
    fireEvent.contextMenu(await screen.findByText("beta"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
    expect(edit).toHaveBeenCalledWith(sections[1]);
  });

  it("opens the same section action from its focused heading", async () => {
    const edit = vi.fn();
    render(<MarkdownView content={content} fileId="f" locale="en"
      sections={sections} onEditSection={edit} onNavigate={() => {}} />);
    const target = await screen.findByLabelText("Edit section: two");
    target.focus();
    fireEvent.keyDown(target, { key: "F10", shiftKey: true });
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
    expect(edit).toHaveBeenCalledWith(sections[1]);
  });

  it("targets preheading text and keeps a list heading inside its parent section", async () => {
    const nested = "intro\n# One\n- item\n  # Nested\n## Child\nmore\n";
    const first = nested.indexOf("# One");
    const child = nested.indexOf("## Child");
    const descriptors: SectionDescriptor[] = [
      { ...section("before", 0, first, 0), kind: "preheading", label: "" },
      section("one", first, child, 1),
      { ...section("child", child, nested.length, 2), level: 2 }
    ];
    const edit = vi.fn();
    render(<MarkdownView content={nested} fileId="f" locale="en"
      sections={descriptors} onEditSection={edit} onNavigate={() => {}} />);
    fireEvent.contextMenu(await screen.findByText("intro"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
    expect(edit).toHaveBeenLastCalledWith(descriptors[0]);
    fireEvent.contextMenu(await screen.findByText("Nested"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
    expect(edit).toHaveBeenLastCalledWith(descriptors[1]);
  });

  it("disables editing with an explanation when rendered and native headings disagree", async () => {
    const edit = vi.fn();
    render(<MarkdownView content={"# One\n# Two\n"} fileId="f" locale="en"
      sections={[section("one", 0, 6, 0)]} onEditSection={edit} onNavigate={() => {}} />);
    fireEvent.contextMenu(await screen.findByText("One"));
    expect(screen.getByRole("menuitem", { name: "Edit section" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("This section changed before editing began")).toBeTruthy();
    expect(edit).not.toHaveBeenCalled();
  });
});
