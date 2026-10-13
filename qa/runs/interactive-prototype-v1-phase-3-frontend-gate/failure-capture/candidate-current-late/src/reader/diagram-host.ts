import { api } from "../app/api";
export interface DiagramPixels { jobId: string; generation: number; width: number; height: number; bytes: number[] }
interface Job { id: string; generation: number; source: string; cancelled: boolean; resolve: (value: DiagramPixels) => void; reject: (error: Error) => void }
const queue: Job[] = [];
let active: Job | null = null;
let generation = 0;
// Keep only validated successful pixels across reader remounts (for example,
// switching tabs). Errors and cancelled work must always remain retryable.
const cache = new Map<string, { width: number; height: number; bytes: Uint8Array }>();
let cacheBytes = 0;
function remember(source: string, value: DiagramPixels) {
  const previous = cache.get(source);
  if (previous) { cacheBytes -= previous.bytes.byteLength; cache.delete(source); }
  const bytes = new Uint8Array(value.bytes);
  cache.set(source, { width: value.width, height: value.height, bytes });
  cacheBytes += bytes.byteLength;
  while (cache.size > 8 || cacheBytes > 8 * 1024 * 1024) {
    const oldest = cache.keys().next().value!;
    cacheBytes -= cache.get(oldest)!.bytes.byteLength;
    cache.delete(oldest);
  }
}
const failure = () => new Error("Diagram unavailable; source is preserved");
// PNG framing/CRC validation only. Native ImageDecoder still owns actual decoding.
// https://www.w3.org/TR/png-3/#5Chunk-layout and #5CRC-algorithm
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function completePng(bytes: number[]): boolean {
  const u32 = (offset: number) => bytes[offset] * 0x1000000 + bytes[offset + 1] * 0x10000
    + bytes[offset + 2] * 0x100 + bytes[offset + 3];
  let offset = 8;
  let imageData = false;
  let chunks = 0;
  while (offset + 12 <= bytes.length && ++chunks <= 4096) {
    const length = u32(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return false;
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/.test(type) || (offset === 8 ? type !== "IHDR" || length !== 13 : type === "IHDR")) return false;
    let crc = 0xffffffff;
    for (let index = offset + 4; index < end - 4; index++) crc = crcTable[(crc ^ bytes[index]) & 255] ^ (crc >>> 8);
    if (((crc ^ 0xffffffff) >>> 0) !== u32(end - 4)) return false;
    if (type === "IDAT") imageData = true;
    if (type === "IEND") return length === 0 && imageData && end === bytes.length;
    offset = end;
  }
  return false;
}
function validPixels(value: DiagramPixels, job: Job): boolean {
  if (!value || typeof value !== "object" || value.jobId !== job.id || value.generation !== job.generation || !Number.isInteger(value.width) || !Number.isInteger(value.height) || value.width < 1 || value.height < 1 || value.width > 2048 || value.height > 2048 || !Array.isArray(value.bytes) || value.bytes.length < 24 || value.bytes.length > 4*1024*1024) return false;
  return value.bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)
    && [137,80,78,71,13,10,26,10].every((byte,index) => value.bytes[index] === byte)
    && String.fromCharCode(...value.bytes.slice(12,16)) === "IHDR"
    && new DataView(new Uint8Array(value.bytes.slice(16,24)).buffer).getUint32(0) === value.width
    && new DataView(new Uint8Array(value.bytes.slice(16,24)).buffer).getUint32(4) === value.height
    && completePng(value.bytes);
}
function drain() {
  if (active) return;
  const job = queue.shift();
  if (!job) return;
  if (job.cancelled) { drain(); return; }
  active = job;
  let request: Promise<DiagramPixels>;
  try { request=api.renderDiagram(job.source,job.id,job.generation); }
  catch { job.reject(failure());active=null;drain();return; }
  void request.then(value => {
    if (!job.cancelled) {
      if (validPixels(value,job)) { remember(job.source,value); job.resolve(value); } else job.reject(failure());
    }
  }, () => { if (!job.cancelled) job.reject(failure()); }).finally(() => { active=null;drain(); });
}
export function renderDiagram(source: string): { promise: Promise<DiagramPixels>; cancel: () => void } {
  let job: Job | undefined;
  const promise = new Promise<DiagramPixels>((resolve,reject) => {
    if (new TextEncoder().encode(source).length > 32768) { reject(failure()); return; }
    const cached = cache.get(source);
    if (cached) {
      cache.delete(source); cache.set(source,cached);
      resolve({ jobId: crypto.randomUUID(), generation: ++generation,
        width: cached.width, height: cached.height, bytes: Array.from(cached.bytes) });
      return;
    }
    if (queue.length + Number(Boolean(active)) >= 32) { reject(failure()); return; }
    job = { id: crypto.randomUUID(),generation:++generation,source,cancelled:false,resolve,reject };
    queue.push(job);drain();
  });
  return { promise,cancel: () => {
    if (!job || job.cancelled) return;
    job.cancelled=true;job.reject(failure());
    const index=queue.indexOf(job);if(index>=0) queue.splice(index,1);
    if(active===job) void api.cancelDiagram(job.id).catch(error => { console.error("Diagram cancellation failed; native deadline remains active", error); });
  } };
}
