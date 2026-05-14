import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { accountRoutes } from "./api/account.js";
import { activityRoutes } from "./api/activity.js";
import { authRoutes } from "./api/auth.js";
import { channelRoutes } from "./api/channels.js";
import { dashboardRoutes } from "./api/dashboard.js";
import { kbRoutes } from "./api/kb.js";
import { meRoutes } from "./api/me.js";
import { requireSession } from "./middleware/session.js";

const app = new Hono();

app.route("/api/auth", authRoutes);
app.route("/api/account", accountRoutes);
app.route("/api/activity", activityRoutes);
app.route("/api/channels", channelRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/kb", kbRoutes);
app.route("/api/me", meRoutes);

app.use("/dashboard/*", requireSession("redirect"));

// Every page lives at <route>/index.html on disk. Files (assets) keep their path.
app.use(
  "*",
  serveStatic({
    root: "./public",
    rewriteRequestPath: (path) =>
      /\.[a-z0-9]+$/i.test(path) ? path : `${path.replace(/\/$/, "")}/index.html`,
  }),
);

app.notFound((c) => c.text("Not found", 404));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`parrot-web listening on http://localhost:${port}`);
});
