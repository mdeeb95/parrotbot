ALTER TABLE "channels" ALTER COLUMN "kb" SET DEFAULT '{"identity":{"name":"","pronouns":""},"bio":"","game":"","schedule":"","links":{"twitter":"","youtube":"","discord":""},"custom_fields":[],"custom_qa":[]}'::jsonb;
--> statement-breakpoint
UPDATE "channels"
SET "kb" = jsonb_build_object(
  'identity', coalesce("kb"->'identity', '{"name":"","pronouns":""}'::jsonb),
  'bio', '',
  'game', coalesce("kb"->'current_session'->>'game', ''),
  'schedule', coalesce("kb"->>'schedule', ''),
  'links', coalesce("kb"->'links', '{"twitter":"","youtube":"","discord":""}'::jsonb),
  'custom_fields', '[]'::jsonb,
  'custom_qa', coalesce("kb"->'faq', '[]'::jsonb)
)
WHERE "kb" ? 'current_session' OR "kb" ? 'addons_and_ui' OR "kb" ? 'faq';
