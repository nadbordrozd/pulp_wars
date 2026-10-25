import type { Ruleset7AiProgressScheduler } from "./v7-controller";

/**
 * The browser's AI progress scheduler (bead `pulp_wars-2yc.99`,
 * docs/architecture/PERFORMANCE.md "AI turns with big armies").
 *
 * The controller runs the Normal AI's policy in 4 ms slices and yields to
 * the page between them. With `setTimeout(resume, 0)` (the controller's
 * default) every yield after the fifth nested one is clamped to at least
 * 4 ms by the browser, so a long decision spent about half its wall time
 * waiting: on a 16 x 16 board with an 80-unit Undead army in Fast Forward,
 * 6.5 s of a 17 s turn was idle. A message posted on a MessageChannel is a
 * task of its own with no clamp: the page still renders and handles input
 * between slices (the event loop updates the rendering between tasks when a
 * frame is due), and the policy is the same deterministic work, so the AI's
 * commands are unchanged; only the waiting goes.
 *
 * Null where there is no MessageChannel; the controller then keeps
 * `setTimeout`. Tasks run in the order they were scheduled; a cancelled one
 * is skipped.
 */
export function messageChannelAiSchedulerV7(
  scope: { readonly MessageChannel?: typeof MessageChannel } = globalThis,
): Ruleset7AiProgressScheduler | null {
  const Channel = scope.MessageChannel;
  if (typeof Channel !== "function") return null;
  const channel = new Channel();
  const queue: { readonly resume: () => void; cancelled: boolean }[] = [];
  channel.port1.onmessage = () => {
    const task = queue.shift();
    if (task !== undefined && !task.cancelled) task.resume();
  };
  return (resume) => {
    const task = { resume, cancelled: false };
    queue.push(task);
    channel.port2.postMessage(null);
    return () => {
      task.cancelled = true;
    };
  };
}
