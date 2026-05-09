export function formatReply(answer: string, displayNames: string[]): string {
  let body: string;
  if (displayNames.length === 1) {
    body = `@${displayNames[0]} ${answer}`;
  } else if (displayNames.length <= 5) {
    body = `${displayNames.map((a) => `@${a}`).join(" ")} — ${answer}`;
  } else {
    body = `${answer} (lots of you asked)`;
  }
  if (body.length > 450) body = body.slice(0, 449) + "…";
  return body;
}
