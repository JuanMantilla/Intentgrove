// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ReadingSettings, { type ReadingPreferences } from "../../src/app/ReadingSettings";

afterEach(cleanup);
const defaults: ReadingPreferences = { readingFont: "roboto", readingSize: 16,
  readingLineHeight: 1.6, readingWidth: 760 };
function Fixture({ initial = defaults, onChange = () => {} }: {
  initial?: ReadingPreferences; onChange?: (value: ReadingPreferences) => void;
}) {
  const [value, setValue] = useState(initial);
  return <ReadingSettings locale="en" value={value} onChange={next => { onChange(next); setValue(next); }} />;
}

describe("approved Reading settings numeric controls", () => {
  it("commits complete numeric choices and synchronizes sliders and the preview", () => {
    const changed = vi.fn();
    render(<Fixture onChange={changed} />);
    const size = screen.getByRole("spinbutton", { name: "Text size (px)" });
    fireEvent.change(size, { target: { value: "2" } });
    expect(changed).not.toHaveBeenCalled();
    fireEvent.change(size, { target: { value: "22" } });
    fireEvent.keyDown(size, { key: "Enter" });
    expect(changed).toHaveBeenLastCalledWith({ ...defaults, readingSize: 22 });
    expect((screen.getByRole("slider", { name: "Text size" }) as HTMLInputElement).value).toBe("22");
    const preview = screen.getByText(/Adjust the type/);
    expect(preview.style.getPropertyValue("--reading-size")).toBe("22px");
    fireEvent.change(screen.getByRole("slider", { name: "Line height" }), { target: { value: "2.1" } });
    expect((screen.getByRole("spinbutton", { name: "Line height" }) as HTMLInputElement).value).toBe("2.1");
    expect(preview.style.getPropertyValue("--reading-line-height")).toBe("2.1");
  });

  it("keeps invalid or unfinished input out of preferences and lets Escape restore the current value", () => {
    const changed = vi.fn();
    render(<Fixture onChange={changed} />);
    const size = screen.getByRole("spinbutton", { name: "Text size (px)" });
    fireEvent.change(size, { target: { value: "99" } });
    fireEvent.blur(size);
    expect(size.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toContain("12–24");
    expect(changed).not.toHaveBeenCalled();
    fireEvent.keyDown(size, { key: "Escape" });
    expect((size as HTMLInputElement).value).toBe("16");
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.change(size, { target: { value: "" } });
    fireEvent.keyDown(size, { key: "Enter" });
    expect(changed).not.toHaveBeenCalled();
    expect(size.getAttribute("aria-invalid")).toBe("true");
  });

  it("retains restored custom values until an explicit choice and resets only Reading", () => {
    const changed = vi.fn();
    render(<Fixture initial={{ ...defaults, readingFont: "serif", readingSize: 18.5,
      readingWidth: 1400 }} onChange={changed} />);
    const width = screen.getByRole("spinbutton", { name: "Page width (px)" });
    expect((width as HTMLInputElement).value).toBe("1400");
    fireEvent.blur(width);
    expect(changed).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reset reading settings" }));
    expect(changed).toHaveBeenLastCalledWith(defaults);
    expect((width as HTMLInputElement).value).toBe("760");
  });
});
