import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({render:vi.fn(),cancel:vi.fn()}));
vi.mock("../../src/app/api",()=>({api:{renderDiagram:mocks.render,cancelDiagram:mocks.cancel}}));
beforeEach(()=>{vi.resetModules();mocks.render.mockReset();mocks.cancel.mockReset().mockResolvedValue(undefined);});
const realPng=readFileSync(new URL("../fixtures/diagram-pixels.png",import.meta.url));
function pixels(jobId:string,generation:number) { return {jobId,generation,width:realPng.readUInt32BE(16),height:realPng.readUInt32BE(20),bytes:Array.from(realPng)}; }
const deferred=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return{promise,resolve};};
it("serializes work, removes queued cancellations and discards late cancelled output",async()=>{
 const first=deferred<ReturnType<typeof pixels>>();mocks.render.mockImplementationOnce(()=>first.promise).mockImplementation((_:string,id:string,g:number)=>Promise.resolve(pixels(id,g)));
 const {renderDiagram}=await import("../../src/reader/diagram-host");const a=renderDiagram("flowchart LR\nA-->B");const aRejected=expect(a.promise).rejects.toThrow();const b=renderDiagram("flowchart LR\nC-->D");const bRejected=expect(b.promise).rejects.toThrow();const c=renderDiagram("sequenceDiagram\nA->>B: hi");
 expect(mocks.render).toHaveBeenCalledTimes(1);b.cancel();a.cancel();expect(mocks.cancel).toHaveBeenCalledWith(mocks.render.mock.calls[0][1]);first.resolve(pixels(mocks.render.mock.calls[0][1],mocks.render.mock.calls[0][2]));await Promise.all([aRejected,bRejected]);await c.promise;expect(mocks.render).toHaveBeenCalledTimes(2);expect(mocks.render.mock.calls[1][0]).toContain("sequenceDiagram");
});
it.each(["job","generation","pixels","truncated"])("rejects forged or invalid %s output",async kind=>{
 mocks.render.mockImplementation((_:string,id:string,g:number)=>{const value=pixels(id,g);if(kind==="job")value.jobId="forged";if(kind==="generation")value.generation++;if(kind==="pixels")value.width=2049;if(kind==="truncated")value.bytes.pop();return Promise.resolve(value);});
 const {renderDiagram}=await import("../../src/reader/diagram-host");await expect(renderDiagram("flowchart LR\nA-->B").promise).rejects.toThrow();
});
it("counts UTF-8 source bytes before invoking native rendering",async()=>{const {renderDiagram}=await import("../../src/reader/diagram-host");await expect(renderDiagram("é".repeat(20000)).promise).rejects.toThrow();expect(mocks.render).not.toHaveBeenCalled();});
it("bounds the queue and drains all test-owned jobs",async()=>{
 const pending=deferred<ReturnType<typeof pixels>>();mocks.render.mockImplementationOnce(()=>pending.promise).mockImplementation((_:string,id:string,g:number)=>Promise.resolve(pixels(id,g)));const {renderDiagram}=await import("../../src/reader/diagram-host");const jobs=Array.from({length:32},()=>renderDiagram("flowchart LR\nA-->B"));await expect(renderDiagram("flowchart LR\nA-->B").promise).rejects.toThrow();pending.resolve(pixels(mocks.render.mock.calls[0][1],mocks.render.mock.calls[0][2]));await Promise.all(jobs.map(j=>j.promise));expect(mocks.render).toHaveBeenCalledTimes(32);
});

it.each(["body-checksum","iend-truncated","chunk-length","trailing-data"])("rejects malformed real native PNG: %s",async kind=>{
 mocks.render.mockImplementation((_:string,id:string,g:number)=>{const value=pixels(id,g);if(kind==="body-checksum")value.bytes[45]^=1;if(kind==="iend-truncated")value.bytes.pop();if(kind==="chunk-length")value.bytes[8]=255;if(kind==="trailing-data")value.bytes.push(0);return Promise.resolve(value)});
 const {renderDiagram}=await import("../../src/reader/diagram-host");await expect(renderDiagram("flowchart LR\nA-->B").promise).rejects.toThrow();
});

it("reuses only validated successes and retries failures on later visits",async()=>{
 const {renderDiagram}=await import("../../src/reader/diagram-host");
 mocks.render.mockImplementation((_:string,id:string,g:number)=>Promise.resolve(pixels(id,g)));
 const source="sequenceDiagram\nAlice->>Bob: Hello";
 const first=await renderDiagram(source).promise;
 const second=await renderDiagram(source).promise;
 expect(second.bytes).toEqual(first.bytes);
 expect(mocks.render).toHaveBeenCalledTimes(1);
 mocks.render.mockRejectedValueOnce(Error("deadline"));
 await expect(renderDiagram("flowchart LR\nRetry-->Later").promise).rejects.toThrow();
 await expect(renderDiagram("flowchart LR\nRetry-->Later").promise).resolves.toMatchObject({width:first.width});
 expect(mocks.render).toHaveBeenCalledTimes(3);
});
it("evicts older successes when the entry bound is reached",async()=>{
 const {renderDiagram}=await import("../../src/reader/diagram-host");
 mocks.render.mockImplementation((_:string,id:string,g:number)=>Promise.resolve(pixels(id,g)));
 for(let i=0;i<9;i++)await renderDiagram(`flowchart LR\nA-->B${i}`).promise;
 await renderDiagram("flowchart LR\nA-->B0").promise;
 expect(mocks.render).toHaveBeenCalledTimes(10);
});
