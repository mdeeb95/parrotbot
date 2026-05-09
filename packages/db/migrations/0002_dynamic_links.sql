ALTER TABLE "channels" ALTER COLUMN "kb" SET DEFAULT '{"identity":{"name":"","pronouns":""},"bio":"","game":"","schedule":"","links":[],"custom_fields":[],"custom_qa":[]}'::jsonb;
--> statement-breakpoint
UPDATE "channels"
SET "kb" = jsonb_set(
  "kb",
  '{links}',
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('label', x.label, 'url', x.url))
      FROM (VALUES
        ('Twitter',  "kb"->'links'->>'twitter'),
        ('YouTube',  "kb"->'links'->>'youtube'),
        ('Discord',  "kb"->'links'->>'discord')
      ) AS x(label, url)
      WHERE x.url IS NOT NULL AND x.url <> ''
    ),
    '[]'::jsonb
  ),
  true
)
WHERE jsonb_typeof("kb"->'links') = 'object';
