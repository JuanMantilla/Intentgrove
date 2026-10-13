import { describe, expect, it, vi } from "vitest";
import { startAcceptanceUI } from "../acceptance/qa/bootstrap";
describe("QA entry respects preference-only Settings capabilities", () => {
  it("mounts Settings without attempting a denied event subscription", async () => {
    const listen = vi.fn().mockRejectedValue(new Error("event subscription denied"));
    const mount = vi.fn().mockResolvedValue(undefined);
    await startAcceptanceUI("?settings", listen, mount);
    expect(listen).not.toHaveBeenCalled(); expect(mount).toHaveBeenCalledOnce();
  });
  it("installs the reader bridge before mounting its UI", async () => {
    const order: string[] = [];
    await startAcceptanceUI("", async () => { order.push("bridge"); }, async () => { order.push("mount"); });
    expect(order).toEqual(["bridge", "mount"]);
  });
  it("propagates a reader bridge failure instead of silently losing observations", async () => {
    const mount = vi.fn();
    await expect(startAcceptanceUI("", async () => { throw Error("bridge unavailable"); }, mount)).rejects.toThrow("bridge unavailable");
    expect(mount).not.toHaveBeenCalled();
  });
});
