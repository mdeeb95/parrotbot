import { createMiddleware } from "hono/factory";
import { parseSession, type Session } from "../lib/session.js";

export type SessionVars = { session: Session };

// requireSession: 401 for JSON API routes, redirect for HTML pages.
export const requireSession = (mode: "json" | "redirect") =>
  createMiddleware<{ Variables: SessionVars }>(async (c, next) => {
    const session = parseSession(c.req.header("cookie"));
    if (!session) {
      if (mode === "json") return c.json({ error: "unauthorized" }, 401);
      return c.redirect("/");
    }
    c.set("session", session);
    await next();
  });
