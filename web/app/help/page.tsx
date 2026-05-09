import Link from "next/link";

export const metadata = {
  title: "Parrot — chat command reference",
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[820px] px-6 py-10">
      <Link
        href="/"
        className="text-[14px] text-text-muted transition-colors hover:text-text"
      >
        ← Back
      </Link>

      <h1 className="mt-6 text-[32px] font-bold">Chat commands</h1>
      <p className="mt-2 text-[15px] text-text-muted">
        Run these in your Twitch chat. Only the broadcaster and moderators can
        run them — everyone else is silently ignored.
      </p>

      <Section title="On / off / status">
        <Row cmd="!parrot on" desc="Resume posting." />
        <Row
          cmd="!parrot off"
          desc="Pause posting. Resets to on whenever the bot restarts."
        />
        <Row
          cmd="!parrot stats"
          desc="Replies with today's seen / kept / posted / blocked / token counts."
        />
        <Row cmd="!parrot help" desc="Replies with a link to this page." />
      </Section>

      <Section title="Update the knowledge base from chat">
        <p className="mb-4 text-[14px] text-text-muted">
          Quick edits without leaving stream. Five fixed paths can be set without
          quotes:
        </p>
        <Row
          cmd={`!parrot set bio "I climb and play PoE2"`}
          desc="Update your bio."
        />
        <Row
          cmd="!parrot set game World of Warcraft Classic"
          desc="Update what you're playing."
        />
        <Row
          cmd="!parrot set schedule Mon-Fri 7pm PT"
          desc="Update when you stream."
        />
        <Row
          cmd="!parrot set identity.name Mathew"
          desc="Update your name."
        />
        <Row
          cmd="!parrot set identity.pronouns he/him"
          desc="Update your pronouns."
        />

        <p className="mb-4 mt-6 text-[14px] text-text-muted">
          For custom fields, Q&A, and links — these update an{" "}
          <strong className="text-text">existing</strong> entry by label. Add
          new entries via the dashboard:
        </p>
        <Row
          cmd={`!parrot set field "Build" https://wago.io/abc`}
          desc="Update a custom field by label."
        />
        <Row
          cmd={`!parrot set qa "What's your setup?" 3090, 5800X`}
          desc="Update a Q&A entry by question."
        />
        <Row
          cmd={`!parrot set link "LinkedIn" https://linkedin.com/in/...`}
          desc="Update a link entry by label."
        />
      </Section>

      <Section title="Quiet things down">
        <Row
          cmd="!parrot ignore <intent> [minutes]"
          desc='Stop answering this intent for N minutes (default 5). Intent IDs are visible in the activity log — they look like "current_game" or "custom_qa:qa_3".'
        />
        <Row
          cmd="!parrot ban <username>"
          desc="Ignore everything from this user for the rest of the session. Resets on bot restart."
        />
      </Section>

      <Section title="What the bot can't do">
        <ul className="list-disc space-y-1.5 pl-5 text-[14px] text-text-muted">
          <li>Ban, time out, or delete chat messages</li>
          <li>Read whispers</li>
          <li>Read other channels</li>
          <li>Add new custom fields, Q&A, or links from chat (use the dashboard)</li>
        </ul>
      </Section>

      <p className="mt-10 text-[13px] text-text-muted">
        Bot replies to commands obey the same on/off and shadow-mode flags as
        normal answers — if posting is paused, command confirmations are paused
        too. Toggle with <code className="rounded bg-bg px-1.5 py-px text-accent">!parrot on</code>.
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-[20px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,_2fr)_3fr] sm:gap-4">
      <code className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[13px] text-accent">
        {cmd}
      </code>
      <p className="self-center text-[14px] text-text-muted">{desc}</p>
    </div>
  );
}
