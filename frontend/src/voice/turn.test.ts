import { expect, it, vi } from "vitest";
import { TurnManager } from "./turn";
it("supersedes and aborts old turns without stale callbacks", async () => {
  const manager = new TurnManager();
  const first = manager.begin();
  let finish!: (text: string) => void;
  const action = vi.fn();
  const pending = first
    .wait(new Promise<string>((r) => (finish = r)))
    .then(action);
  const rejected = expect(pending).rejects.toMatchObject({
    name: "AbortError",
  });
  const next = manager.begin();
  finish("late");
  await rejected;
  expect(action).not.toHaveBeenCalled();
  expect(first.signal.aborted).toBe(true);
  expect(next.id).not.toBe(first.id);
  expect(next.isActive()).toBe(true);
});
it("cancel invalidates synchronous side-effect guards", () => {
  const manager = new TurnManager();
  const turn = manager.begin();
  manager.cancel();
  expect(turn.isActive()).toBe(false);
  expect(() => turn.assertActive()).toThrow();
});
