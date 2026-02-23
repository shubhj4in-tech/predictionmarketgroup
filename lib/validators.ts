import { z } from "zod";

export const CreateGroupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters").trim(),
  description: z.string().max(500).trim().optional(),
});

export const CreateMarketSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters").max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  close_time: z
    .string()
    .datetime({ message: "close_time must be a valid ISO 8601 date" })
    .refine((v) => new Date(v) > new Date(), { message: "close_time must be in the future" }),
  b_liquidity: z.number().min(1).max(10000).default(50).optional(),
});

export const TradeSchema = z.object({
  outcome: z.enum(["YES", "NO"]),
  spend: z.number().positive("spend must be positive"),
  note: z
    .string()
    .min(1, "note is required")
    .max(240, "note must be at most 240 characters")
    .trim(),
});

export const ResolveSchema = z.object({
  outcome: z.enum(["YES", "NO"]),
});

export const CreateInviteSchema = z.object({
  group_id: z.string().uuid(),
  expires_in_hours: z.number().positive().optional(),
  max_uses: z.number().int().positive().optional(),
});

/** Parse request body with a Zod schema, returns { data } or { error: NextResponse } */
import { NextResponse } from "next/server";

export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return {
      data: null,
      error: NextResponse.json({ error: message, code: "validation_error" }, { status: 400 }),
    };
  }

  return { data: result.data, error: null };
}
