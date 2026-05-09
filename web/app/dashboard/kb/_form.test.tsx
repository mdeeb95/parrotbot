import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { KbForm } from "./_form";
import type { KnowledgeBase } from "@parrot/db/schema";

const baseKb: KnowledgeBase = {
  identity: { name: "aoDeeb", pronouns: "he/him" },
  bio: "Variety streamer.",
  game: "PoE2",
  schedule: "MWF 7pm PT",
  links: [{ label: "Twitter", url: "https://x.com/aodeeb" }],
  custom_fields: [],
  custom_qa: [],
};

// The accordion sections "Game", "Schedule", "Links", "Custom Q&A" are
// closed by default — their inputs aren't mounted. This helper opens them.
async function openSection(user: ReturnType<typeof userEvent.setup>, name: string) {
  const trigger = screen.getByRole("button", { name });
  if (trigger.getAttribute("aria-expanded") !== "true") {
    await user.click(trigger);
  }
}

function okFetch(body: unknown = { ok: true }) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

function errFetch(status: number, body: unknown) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", okFetch());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KbForm — rendering", () => {
  it("renders existing values from the initial prop (open sections only)", () => {
    render(<KbForm initial={baseKb} />);
    // About + Bio + Custom info are open by default.
    expect(screen.getByDisplayValue("aoDeeb")).toBeInTheDocument();
    expect(screen.getByDisplayValue("he/him")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Variety streamer.")).toBeInTheDocument();
  });

  it("renders all section headers", () => {
    render(<KbForm initial={baseKb} />);
    for (const name of [
      "About you",
      "Bio",
      "Game",
      "Schedule",
      "Links",
      "Custom info",
      "Custom Q&A",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("renders Game/Schedule/Links values after opening their sections", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Game");
    expect(screen.getByDisplayValue("PoE2")).toBeInTheDocument();
    await openSection(user, "Schedule");
    expect(screen.getByDisplayValue("MWF 7pm PT")).toBeInTheDocument();
    await openSection(user, "Links");
    expect(screen.getByDisplayValue("Twitter")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://x.com/aodeeb"),
    ).toBeInTheDocument();
  });
});

describe("KbForm — repeaters", () => {
  it("adds a link via Add another", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Links");
    const before = screen.getAllByPlaceholderText("https://x.com/...").length;
    // The Links section's Add is the first one rendered (Links > Custom info > Custom Q&A).
    const addButtons = screen.getAllByRole("button", { name: /add another/i });
    await user.click(addButtons[0]);
    const after = screen.getAllByPlaceholderText("https://x.com/...").length;
    expect(after).toBe(before + 1);
  });

  it("removes a link via Trash", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Links");
    expect(
      screen.getByDisplayValue("https://x.com/aodeeb"),
    ).toBeInTheDocument();
    const link1 = screen.getByText("Link #1").closest("div")!;
    await user.click(within(link1).getByRole("button", { name: /remove/i }));
    expect(screen.queryByDisplayValue("https://x.com/aodeeb")).toBeNull();
  });
});

describe("KbForm — save flow (valid)", () => {
  it("disables save when pristine and enables after edit", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    const save = screen.getByRole("button", { name: /save changes/i });
    expect(save).toBeDisabled();
    await openSection(user, "Game");
    await user.type(screen.getByDisplayValue("PoE2"), "x");
    expect(save).not.toBeDisabled();
  });

  it("PUTs the full payload and shows Saved", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Game");
    const game = screen.getByDisplayValue("PoE2");
    await user.clear(game);
    await user.type(game, "WoW Classic");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = (
      fetch as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.game).toBe("WoW Classic");
    expect(toast.success).toHaveBeenCalled();
    expect(await screen.findByText(/Saved (just now|\d+s ago)/)).toBeInTheDocument();
  });

  it("double-clicking Save fires only one fetch", async () => {
    const user = userEvent.setup();
    let resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((r) => (resolve = r))),
    );
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Game");
    await user.type(screen.getByDisplayValue("PoE2"), "x");
    const save = screen.getByRole("button", { name: /save changes/i });
    await user.click(save);
    await user.click(save);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("shows lastSavedAt timestamp after save", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Game");
    await user.type(screen.getByDisplayValue("PoE2"), "x");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(
      await screen.findByText(/Saved (just now|\d+s ago)/),
    ).toBeInTheDocument();
  });
});

describe("KbForm — validation feedback", () => {
  it("invalid submit names every offending field path in the banner", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Links");
    await user.clear(screen.getByDisplayValue("Twitter"));
    await user.clear(screen.getByDisplayValue("https://x.com/aodeeb"));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const alerts = await screen.findAllByRole("alert");
    const banner = alerts.find((b) =>
      /\d+ errors? —/.test(b.textContent ?? ""),
    );
    expect(banner).toBeDefined();
    expect(banner!).toHaveTextContent(/links\.0\.label/);
    expect(banner!).toHaveTextContent(/links\.0\.url/);
  });

  it("empty link label triggers row-level FieldError", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Links");
    await user.clear(screen.getByDisplayValue("Twitter"));
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    const alerts = await screen.findAllByRole("alert");
    expect(
      alerts.some((a) => /label required/i.test(a.textContent ?? "")),
    ).toBe(true);
  });

  it("invalid URL triggers row-level FieldError", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Links");
    const url = screen.getByDisplayValue("https://x.com/aodeeb");
    await user.clear(url);
    await user.type(url, "not-a-url");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    const alerts = await screen.findAllByRole("alert");
    expect(
      alerts.some((a) => /must be a valid url/i.test(a.textContent ?? "")),
    ).toBe(true);
  });

  it("top-level field overflow renders FieldError near the input AND in banner", async () => {
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    const bio = screen.getByDisplayValue("Variety streamer.");
    await user.clear(bio);
    await user.click(bio);
    await user.paste("x".repeat(2001));
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    const alerts = await screen.findAllByRole("alert");
    const banner = alerts.find((a) =>
      /\d+ errors? —/.test(a.textContent ?? ""),
    );
    expect(banner).toBeDefined();
    expect(banner!).toHaveTextContent(/bio/);
  });
});

describe("KbForm — server / network errors", () => {
  it("400 with fieldErrors surfaces field path in toast", async () => {
    vi.stubGlobal(
      "fetch",
      errFetch(400, {
        error: "invalid_body",
        issues: { fieldErrors: { game: ["Too long"] }, formErrors: [] },
      }),
    );
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Game");
    await user.type(screen.getByDisplayValue("PoE2"), "x");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(toast.error).toHaveBeenCalled();
    const arg = (
      toast.error as unknown as { mock: { calls: [string][] } }
    ).mock.calls[0][0];
    expect(arg).toMatch(/game/);
    expect(arg).toMatch(/Too long/);
  });

  it("network error shows generic toast", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const user = userEvent.setup();
    render(<KbForm initial={baseKb} />);
    await openSection(user, "Game");
    await user.type(screen.getByDisplayValue("PoE2"), "x");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(toast.error).toHaveBeenCalled();
    const arg = (
      toast.error as unknown as { mock: { calls: [string][] } }
    ).mock.calls[0][0];
    expect(arg).toMatch(/Couldn't save/);
  });
});
