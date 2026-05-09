ALTER TABLE "answers_log"
  ADD COLUMN IF NOT EXISTS "block_reason" text,
  ADD COLUMN IF NOT EXISTS "input_messages" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "answers_log_channel_block_reason_idx"
  ON "answers_log" ("channel_id", "block_reason");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocks_summary" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "block_reason" text NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  CONSTRAINT "blocks_summary_uniq" UNIQUE ("channel_id", "date", "block_reason")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blocks_summary_channel_date_idx"
  ON "blocks_summary" ("channel_id", "date");
