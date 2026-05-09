import type { Batcher, ChatMessage } from "./types.js";

export function createBatcher(deps: {
  windowMs: number;
  maxSize: number;
  onFlush: (messages: ChatMessage[]) => Promise<void> | void;
}): Batcher {
  let queue: ChatMessage[] = [];
  let timer: NodeJS.Timeout | null = null;

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length === 0) return;
    const messages = queue;
    queue = [];
    Promise.resolve(deps.onFlush(messages)).catch((err) => {
      // Swallow — caller logs via its own logger context.
      console.error("[batcher] onFlush error:", err);
    });
  }

  function onKeptMessage(msg: ChatMessage) {
    queue.push(msg);
    if (queue.length === 1) {
      timer = setTimeout(flush, deps.windowMs);
    }
    if (queue.length >= deps.maxSize) {
      flush();
    }
  }

  function shutdown() {
    flush();
  }

  return { onKeptMessage, shutdown };
}
