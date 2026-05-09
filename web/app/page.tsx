import Link from "next/link";

const TwitchIcon = ({ className = "" }: { className?: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

export default function LandingPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const authError = searchParams?.error === "auth_failed";

  return (
    <div className="mx-auto max-w-container px-6">
      <nav className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5 text-[22px] font-bold">
          <span className="text-[26px]">🦜</span>
          Parrot
        </div>
        <ul className="flex list-none items-center gap-8">
          <li className="hidden sm:block">
            <a
              href="#features"
              className="text-[15px] text-text-muted transition-colors hover:text-text"
            >
              Features
            </a>
          </li>
          <li className="hidden sm:block">
            <a
              href="#how"
              className="text-[15px] text-text-muted transition-colors hover:text-text"
            >
              How it works
            </a>
          </li>
          <li className="hidden sm:block">
            <a
              href="#pricing"
              className="text-[15px] text-text-muted transition-colors hover:text-text"
            >
              Pricing
            </a>
          </li>
          <li>
            <Link
              href="/api/auth/twitch"
              className="inline-flex items-center justify-center gap-2.5 rounded-lg border-none bg-twitch px-[22px] py-3 text-[15px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-twitch-hover"
            >
              Sign in with Twitch
            </Link>
          </li>
        </ul>
      </nav>

      {authError && (
        <div className="mb-4 rounded-lg border border-accent bg-bg-elevated px-5 py-3 text-center text-[14px] text-text">
          Sign-in didn't complete. Please try again.
        </div>
      )}

      <section className="px-0 pb-[100px] pt-[30px] text-center">
        <div className="mb-[18px] text-[13px] font-semibold uppercase tracking-[0.12em] text-accent">
          For Twitch Streamers
        </div>
        <h1 className="mb-6 text-[40px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[64px]">
          Stop answering the same question{" "}
          <span className="text-accent">fifty times.</span>
        </h1>
        <p className="mx-auto mb-9 max-w-[600px] text-[19px] text-text-muted">
          Parrot is a chat bot that already knows your server, your addons, your
          schedule, and your build link. Your viewers ask, Parrot answers. You
          focus on streaming.
        </p>
        <div className="mb-[18px] flex flex-wrap justify-center gap-3.5">
          <Link
            href="/api/auth/twitch"
            className="inline-flex items-center justify-center gap-2.5 rounded-lg border-none bg-twitch px-[22px] py-3 text-[15px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-twitch-hover"
          >
            <TwitchIcon />
            Sign in with Twitch
          </Link>
          <a
            href="#how"
            className="inline-flex items-center justify-center gap-2.5 rounded-lg border border-border bg-bg-elevated px-[22px] py-3 text-[15px] font-semibold text-text transition-all hover:border-text-muted"
          >
            See how it works
          </a>
        </div>
        <div className="text-[14px] text-text-muted">
          Free for the first 500 answers each month — no credit card required.
        </div>

        <div className="mx-auto mt-14 max-w-[540px] rounded-xl border border-border bg-bg-elevated px-5 py-[18px] text-left font-mono text-[14px] shadow-chat-glow">
          <div className="py-1 text-text-muted">
            <b className="font-semibold text-text">jakethewolf:</b> what server u on
          </div>
          <div className="py-1 text-text-muted">
            <b className="font-semibold text-text">mageboi42:</b> realm?
          </div>
          <div className="py-1 text-text-muted">
            <b className="font-semibold text-text">cattolicker:</b> server name??
          </div>
          <div className="py-1 text-text-muted">
            <b className="font-semibold text-text">mistress_oof:</b> what's the realm
          </div>
          <div className="py-1 pt-2.5 text-green">
            <b className="font-semibold text-accent">🦜 Parrot:</b> @jakethewolf
            @mageboi42 @cattolicker @mistress_oof — Skull Rock, Wrath Classic
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border py-20">
        <h2 className="mb-3.5 text-center text-[30px] font-bold tracking-[-0.015em] sm:text-[40px]">
          Built for streamers, not for chaos.
        </h2>
        <p className="mx-auto mb-14 max-w-[540px] text-center text-[17px] text-text-muted">
          Parrot answers what your chat actually asks all day. Nothing else.
        </p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Feature
            icon="🪺"
            title="Knows your stream"
            body="Server, character, build, addons, schedule, links. Preload everything once, update as you stream."
          />
          <Feature
            icon="⚡"
            title="Smart batched replies"
            body="When 30 viewers ask the same thing at once, Parrot answers them in one message. No spam, no flood."
          />
          <Feature
            icon="🎤"
            title="Update from chat"
            body={
              <>
                Switching games or characters mid-stream? Type{" "}
                <code className="rounded bg-bg px-1.5 py-px text-[13px] text-accent">
                  !parrot set server X
                </code>{" "}
                and you're done.
              </>
            }
          />
          <Feature
            icon="🛡️"
            title="Trolls can't break it"
            body="Multi-layer prompt-injection defense. Parrot never repeats chat content or invents answers."
          />
          <Feature
            icon="🔇"
            title="Quiet by design"
            body="If Parrot doesn't know, it says nothing. Same intent gets one reply, then a cooldown — never spammy."
          />
          <Feature
            icon="📊"
            title="End-of-stream report"
            body="See what your chat was actually asking. Add the gaps to your knowledge base in one click."
          />
        </div>
      </section>

      <section id="how" className="border-t border-border py-20">
        <h2 className="mb-3.5 text-center text-[30px] font-bold tracking-[-0.015em] sm:text-[40px]">
          Four steps, then go live.
        </h2>
        <p className="mx-auto mb-14 max-w-[540px] text-center text-[17px] text-text-muted">
          If you can mod a bot in your chat, you can set up Parrot.
        </p>
        <div className="mx-auto max-w-[640px]">
          <Step
            num={1}
            title="Sign in with Twitch"
            body="One click. Twitch handles the login — we never see your password."
          />
          <Step
            num={2}
            title="Mod the bot so it can post in any chat mode"
            body={
              <>
                Type{" "}
                <code className="rounded bg-bg px-1.5 py-px text-[13px] text-accent">
                  /mod parrotparrotbot
                </code>{" "}
                so Twitch doesn't drop its posts during Slow / Sub / Follower mode. Parrot only posts — no banning or deleting.
              </>
            }
          />
          <Step
            num={3}
            title="Tell Parrot about your stream"
            body="Server, build, addons, schedule, links. About five minutes."
          />
          <Step
            num={4}
            title="Go live"
            body="Parrot starts answering questions the moment your stream goes live. That's it."
            last
          />
        </div>
      </section>

      <section id="pricing" className="border-t border-border py-20">
        <h2 className="mb-3.5 text-center text-[30px] font-bold tracking-[-0.015em] sm:text-[40px]">
          Free until it isn't.
        </h2>
        <p className="mx-auto mb-14 max-w-[540px] text-center text-[17px] text-text-muted">
          Most streams fit comfortably in the free tier.
        </p>
        <div className="mx-auto grid max-w-[720px] grid-cols-1 gap-5 md:grid-cols-2">
          <div className="relative rounded-xl border border-border bg-bg-elevated p-8">
            <h3 className="mb-1.5 text-[18px] font-semibold">Hobby</h3>
            <div className="mb-4 text-[14px] text-text-muted">
              For most streamers, this is plenty.
            </div>
            <div className="mb-1 text-[40px] font-extrabold tracking-[-0.02em]">
              $0
              <span className="text-[16px] font-medium text-text-muted">/mo</span>
            </div>
            <ul className="mb-6 mt-5 list-none space-y-1 text-[14.5px] text-text-muted">
              <PriceLi>500 answers per month</PriceLi>
              <PriceLi>One channel</PriceLi>
              <PriceLi>End-of-stream reports</PriceLi>
              <PriceLi>All safety features</PriceLi>
            </ul>
            <Link
              href="/api/auth/twitch"
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border-none bg-twitch px-[22px] py-3 text-[15px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-twitch-hover"
            >
              Sign in with Twitch
            </Link>
          </div>
          <div className="relative rounded-xl border border-accent bg-bg-elevated p-8">
            <div className="absolute -top-2.5 right-6 rounded-xl bg-accent px-2.5 py-[3px] text-[12px] font-bold text-[#1a0d09]">
              POPULAR
            </div>
            <h3 className="mb-1.5 text-[18px] font-semibold">Pro</h3>
            <div className="mb-4 text-[14px] text-text-muted">
              For full-time streamers and big chats.
            </div>
            <div className="mb-1 text-[40px] font-extrabold tracking-[-0.02em]">
              $15
              <span className="text-[16px] font-medium text-text-muted">/mo</span>
            </div>
            <ul className="mb-6 mt-5 list-none space-y-1 text-[14.5px] text-text-muted">
              <PriceLi>5,000 answers per month</PriceLi>
              <PriceLi>Bring-your-own API key option</PriceLi>
              <PriceLi>Priority support</PriceLi>
              <PriceLi>Early access to new features</PriceLi>
            </ul>
            <Link
              href="/api/auth/twitch"
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border-none bg-accent px-[22px] py-3 text-[15px] font-semibold text-[#1a0d09] transition-all hover:-translate-y-px hover:bg-accent-hover"
            >
              Start Pro
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-20">
        <h2 className="mb-14 text-center text-[30px] font-bold tracking-[-0.015em] sm:text-[40px]">
          Common questions.
        </h2>
        <div className="mx-auto max-w-[720px]">
          <Faq
            q="Will Parrot spam my chat?"
            a="No. Parrot batches messages over a 30-second window and answers everyone with the same question in one reply. After answering, it cools down for several minutes before repeating itself."
          />
          <Faq
            q="Can someone trick Parrot into saying something offensive?"
            a="Multi-layer defense. The model treats chat as data, not instructions. Responses go through a content filter. Nothing from chat is posted verbatim. Repeated injection attempts auto-block the user."
          />
          <Faq
            q="What if Parrot doesn't know the answer?"
            a="It stays silent. Parrot only answers from your knowledge base — it never guesses. Unanswered questions show up on your end-of-stream report so you can add the gaps."
          />
          <Faq
            q="Does this work on YouTube?"
            a="Twitch only for now. YouTube support is coming."
          />
          <Faq
            q="Can I cancel anytime?"
            a="Yes. Cancel from your dashboard. No emails, no calls, no friction."
          />
        </div>
      </section>

      <footer className="border-t border-border py-[60px] pb-10 text-center text-[14px] text-text-muted">
        <ul className="mb-5 flex flex-wrap justify-center gap-7 list-none">
          <li>
            <a href="#" className="hover:text-text">
              About
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-text">
              Terms
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-text">
              Privacy
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-text">
              Contact
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-text">
              Twitter
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-text">
              Discord
            </a>
          </li>
        </ul>
        <div>© 2026 Parrot. Built for streamers.</div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-7 transition-colors hover:border-accent">
      <div className="mb-[18px] flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(255,122,89,0.12)] text-[20px]">
        {icon}
      </div>
      <h3 className="mb-2 text-[18px] font-semibold">{title}</h3>
      <p className="text-[14.5px] text-text-muted">{body}</p>
    </div>
  );
}

function Step({
  num,
  title,
  body,
  last = false,
}: {
  num: number;
  title: string;
  body: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex gap-[22px] py-[22px] ${last ? "" : "border-b border-border"}`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent font-bold text-[#1a0d09]">
        {num}
      </div>
      <div>
        <h4 className="mb-1 text-[17px]">{title}</h4>
        <p className="text-[15px] text-text-muted">{body}</p>
      </div>
    </div>
  );
}

function PriceLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="py-[5px]">
      <span className="mr-2.5 font-bold text-accent">✓</span>
      {children}
    </li>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-border py-[22px] last:border-b-0">
      <div className="mb-2 text-[17px] font-semibold">{q}</div>
      <div className="text-[15px] text-text-muted">{a}</div>
    </div>
  );
}
