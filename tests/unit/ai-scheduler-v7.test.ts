import { describe, expect, it } from "vitest";
import { messageChannelAiSchedulerV7 } from "../../src/app/ai-scheduler-v7";

/** A MessageChannel whose messages are delivered by hand. */
function manualChannel() {
  const pending: (() => void)[] = [];
  class ManualChannel {
    readonly port1: { onmessage: ((event: unknown) => void) | null } = {
      onmessage: null,
    };
    readonly port2 = {
      postMessage: (): void => {
        pending.push(() => this.port1.onmessage?.({}));
      },
    };
  }
  return {
    scope: {
      MessageChannel: ManualChannel as unknown as typeof MessageChannel,
    },
    deliver(): void {
      while (pending.length > 0) pending.shift()?.();
    },
    pending,
  };
}

describe("the browser AI progress scheduler (pulp_wars-2yc.99)", () => {
  it("is null without a MessageChannel, so the controller keeps setTimeout", () => {
    expect(messageChannelAiSchedulerV7({})).toBeNull();
  });

  it("runs scheduled work later, in order, one message each", () => {
    const channel = manualChannel();
    const schedule = messageChannelAiSchedulerV7(channel.scope);
    if (schedule === null) throw new Error("expected a scheduler");
    const ran: string[] = [];
    schedule(() => ran.push("a"));
    schedule(() => ran.push("b"));
    expect(ran).toEqual([]);
    expect(channel.pending).toHaveLength(2);
    channel.deliver();
    expect(ran).toEqual(["a", "b"]);
  });

  it("skips cancelled work and still runs what follows it", () => {
    const channel = manualChannel();
    const schedule = messageChannelAiSchedulerV7(channel.scope);
    if (schedule === null) throw new Error("expected a scheduler");
    const ran: string[] = [];
    const cancel = schedule(() => ran.push("cancelled"));
    schedule(() => ran.push("kept"));
    cancel?.();
    channel.deliver();
    expect(ran).toEqual(["kept"]);
  });

  it("yields through a real MessageChannel", async () => {
    const schedule = messageChannelAiSchedulerV7();
    if (schedule === null) throw new Error("expected a scheduler");
    const order: string[] = [];
    await new Promise<void>((resolve) => {
      schedule(() => {
        order.push("message");
        resolve();
      });
      order.push("sync");
    });
    expect(order).toEqual(["sync", "message"]);
  });
});
