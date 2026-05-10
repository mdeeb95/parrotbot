// Inspect Xaryu shadow-channel activity. Pure ESM, no tsx required.
//   DATABASE_URL=<prod public URL> node packages/db/scripts/view-xaryu.mjs
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

try {
  const [channel] = await sql`
    SELECT id, twitch_channel, is_active, is_modded, settings
    FROM channels
    WHERE twitch_channel = 'xaryu'
    LIMIT 1
  `;
  if (!channel) {
    console.error("xaryu channel not found — run seed-xaryu.ts first");
    process.exit(1);
  }
  console.log("channel:", channel);
  console.log();

  const [usage] = await sql`
    SELECT date, answers_posted, tokens_input, tokens_output
    FROM usage_daily
    WHERE channel_id = ${channel.id} AND date = current_date
    LIMIT 1
  `;
  console.log("today's usage:", usage ?? "(none yet)");
  console.log();

  const blocks = await sql`
    SELECT block_reason, count
    FROM blocks_summary
    WHERE channel_id = ${channel.id} AND date = current_date
    ORDER BY count DESC
  `;
  console.log("today's block summary:");
  if (blocks.length === 0) console.log("  (none yet)");
  for (const b of blocks) console.log(`  ${b.block_reason}: ${b.count}`);
  console.log();

  const recent = await sql`
    SELECT ts, intent, answer_text, asker_count, confidence, block_reason, input_messages
    FROM answers_log
    WHERE channel_id = ${channel.id}
    ORDER BY ts DESC
    LIMIT 30
  `;
  console.log(`recent ${recent.length} attempts (newest first):`);
  for (const r of recent) {
    const status = r.block_reason ? `BLOCKED:${r.block_reason}` : "POSTED";
    const firstQ = r.input_messages?.[0]?.text ?? "";
    const conf = r.confidence != null ? r.confidence.toFixed(2) : "—";
    console.log(`  [${r.ts.toISOString()}] ${status}  intent=${r.intent ?? "—"}  conf=${conf}  askers=${r.asker_count}`);
    console.log(`    Q: ${firstQ.slice(0, 120)}`);
    if (r.answer_text) console.log(`    A: ${r.answer_text.slice(0, 120)}`);
  }
} finally {
  await sql.end();
}
