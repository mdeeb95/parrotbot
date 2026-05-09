CREATE TABLE IF NOT EXISTS "answers_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"intent" text,
	"answer_text" text,
	"asker_count" integer DEFAULT 1 NOT NULL,
	"confidence" real
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"twitch_channel" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_modded" boolean DEFAULT false NOT NULL,
	"kb" jsonb DEFAULT '{"identity":{"name":"","pronouns":""},"current_session":{"game":"","mode":"","character":"","spec":"","server":""},"addons_and_ui":{"weakauras":"","ui_pack":"","notable_addons":[]},"schedule":"","links":{"twitter":"","youtube":"","discord":""},"faq":[]}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_twitch_channel_unique" UNIQUE("twitch_channel")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"date" date NOT NULL,
	"answers_posted" integer DEFAULT 0 NOT NULL,
	"tokens_input" bigint DEFAULT 0 NOT NULL,
	"tokens_output" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_daily_channel_date_uniq" UNIQUE("channel_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"twitch_id" text NOT NULL,
	"twitch_login" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"avatar_url" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_twitch_id_unique" UNIQUE("twitch_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "answers_log" ADD CONSTRAINT "answers_log_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_daily" ADD CONSTRAINT "usage_daily_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "answers_log_channel_ts_idx" ON "answers_log" USING btree ("channel_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_daily_channel_date_idx" ON "usage_daily" USING btree ("channel_id","date");