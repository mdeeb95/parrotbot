import { z } from "zod";

export const kbSchema = z.object({
  identity: z.object({
    name: z.string().trim().max(100),
    pronouns: z.string().trim().max(50),
  }),
  bio: z.string().trim().max(2000),
  game: z.string().trim().max(200),
  schedule: z.string().trim().max(2000),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Label required").max(50),
        url: z
          .string()
          .trim()
          .min(1, "URL required")
          .max(500)
          .regex(/^https?:\/\/.+/i, "Must be a valid URL"),
      }),
    )
    .max(20),
  custom_fields: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Label required").max(100),
        value: z.string().trim().min(1, "Value required").max(1000),
      }),
    )
    .max(50),
  custom_qa: z
    .array(
      z.object({
        question: z.string().trim().min(1, "Question required").max(300),
        answer: z.string().trim().min(1, "Answer required").max(2000),
      }),
    )
    .max(50),
});

export type KbInput = z.infer<typeof kbSchema>;

export const channelSettingsSchema = z
  .object({
    shadow_mode: z.boolean().optional(),
  })
  .strict();

export type ChannelSettings = z.infer<typeof channelSettingsSchema>;
