import { describe, it, expect } from "vitest";
import { formatReply } from "./reply";

describe("formatReply", () => {
  it("1 author: @user <answer>", () => {
    expect(formatReply("hi", ["alice"])).toBe("@alice hi");
  });

  it("2-5 authors: joined with em-dash", () => {
    expect(formatReply("hi", ["alice", "bob", "carol"])).toBe(
      "@alice @bob @carol — hi",
    );
  });

  it("6+ authors: trailing (lots of you asked)", () => {
    const six = ["a", "b", "c", "d", "e", "f"];
    expect(formatReply("answer", six)).toBe("answer (lots of you asked)");
  });

  it("truncates at 450 chars with ellipsis", () => {
    const longAnswer = "x".repeat(500);
    const out = formatReply(longAnswer, ["alice"]);
    expect(out.length).toBeLessThanOrEqual(450);
    expect(out.endsWith("…")).toBe(true);
  });
});
