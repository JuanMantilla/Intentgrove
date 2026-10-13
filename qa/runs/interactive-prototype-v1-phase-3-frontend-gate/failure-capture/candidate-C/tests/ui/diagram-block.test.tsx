// @vitest-environment jsdom
import { URL as NodeURL } from "node:url";
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import MarkdownView from "../../src/reader/MarkdownView";
const realPng=readFileSync(new NodeURL("../fixtures/diagram-pixels.png",import.meta.url));
const mocks=vi.hoisted(()=>({render:vi.fn(),cancel:vi.fn().mockResolvedValue(undefined)}));
vi.mock("../../src/app/api",()=>({api:{renderDiagram:mocks.render,cancelDiagram:mocks.cancel}}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it("renders an inert diagram and preserves malformed source and neighboring content",async()=>{
 vi.stubGlobal("Worker",undefined);vi.spyOn(URL,"createObjectURL").mockReturnValue("blob:diagram");vi.spyOn(URL,"revokeObjectURL").mockImplementation(()=>{});
 mocks.render.mockImplementation((source:string,jobId:string,generation:number)=>source.includes("broken")?Promise.reject(Error("parse")):Promise.resolve({jobId,generation,width:realPng.readUInt32BE(16),height:realPng.readUInt32BE(20),bytes:Array.from(realPng)}));
 render(<MarkdownView content={"Before\n\n```mermaid\nflowchart LR\nA-->B\n```\n\nBetween\n\n```mermaid\nflowchart broken\n```\n\nAfter"} fileId="fixture" locale="en" onNavigate={()=>{}}/>);
 expect((await screen.findByAltText("Mermaid diagram")).getAttribute("src")).toBe("blob:diagram");expect((await screen.findByRole("alert")).textContent).toContain("Diagram unavailable");expect(screen.getByText("flowchart broken")).toBeTruthy();for(const label of ["Before","Between","After"])expect(screen.getByText(label)).toBeTruthy();expect(document.querySelector("svg,iframe")).toBeNull();
});

it("retains a pending diagram through locale and layout rerenders", async () => {
 vi.stubGlobal("Worker",undefined);
 vi.spyOn(URL,"createObjectURL").mockReturnValue("blob:retained");
 vi.spyOn(URL,"revokeObjectURL").mockImplementation(()=>{});
 let finish!:(value:unknown)=>void;
 mocks.render.mockReset().mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 mocks.cancel.mockClear();
 const props={content:"```mermaid\nsequenceDiagram\nAlice->>Bob: Hello\n```",fileId:"pending",onNavigate:()=>{}};
 const view=render(<MarkdownView {...props} locale="en"/>);
 await waitFor(()=>expect(mocks.render).toHaveBeenCalledTimes(1));
 expect(screen.getByRole("status", { name: "Loading…" }).querySelector(".preview-loading-dots")).toBeTruthy();
 view.rerender(<MarkdownView {...props} locale="es" layoutPending/>);
 view.rerender(<MarkdownView {...props} locale="es"/>);
 expect(screen.getByRole("status", { name: "Cargando…" })).toBeTruthy();
 expect(mocks.cancel).not.toHaveBeenCalled();
 expect(mocks.render).toHaveBeenCalledTimes(1);
 const [,jobId,generation]=mocks.render.mock.calls[0];
 await act(async()=>finish({jobId,generation,width:realPng.readUInt32BE(16),height:realPng.readUInt32BE(20),bytes:Array.from(realPng)}));
 expect(await screen.findByRole("img")).toBeTruthy();
 expect(screen.queryByRole("status", { name: "Cargando…" })).toBeNull();
 expect(screen.queryByRole("alert")).toBeNull();
 view.rerender(<MarkdownView {...props} locale="en"/>);
 expect(screen.getByAltText("Mermaid diagram")).toBeTruthy();
 expect(mocks.render).toHaveBeenCalledTimes(1);
});

it("reuses completed flowchart and sequence pixels after leaving and returning to a reader",async()=>{
 vi.stubGlobal("Worker",undefined);
 vi.spyOn(URL,"createObjectURL").mockReturnValue("blob:tab-return");
 vi.spyOn(URL,"revokeObjectURL").mockImplementation(()=>{});
 mocks.render.mockReset().mockImplementation((_:string,jobId:string,generation:number)=>Promise.resolve({jobId,generation,width:realPng.readUInt32BE(16),height:realPng.readUInt32BE(20),bytes:Array.from(realPng)}));
 const props={content:"```mermaid\nflowchart LR\nStart-->End\n```\n\n```mermaid\nsequenceDiagram\nAlice->>Bob: Tab return\n```",fileId:"tab-return",onNavigate:()=>{}};
 const view=render(<MarkdownView {...props} locale="en"/>);
 await waitFor(()=>expect(screen.getAllByRole("img")).toHaveLength(2));
 expect(mocks.render).toHaveBeenCalledTimes(2);
 view.unmount();
 render(<MarkdownView {...props} locale="es"/>);
 await waitFor(()=>expect(screen.getAllByRole("img")).toHaveLength(2));
 expect(mocks.render).toHaveBeenCalledTimes(2);
 expect(screen.queryByRole("alert")).toBeNull();
});
