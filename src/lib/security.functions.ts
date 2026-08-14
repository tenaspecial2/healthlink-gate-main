import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemsSchema = z.object({
  items: z
    .array(
      z.object({
        question: z.string().trim().min(3).max(160),
        answer: z.string().trim().min(1).max(120),
      }),
    )
    .length(4),
});

export const getMySecurityStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("security_questions")
      .select("q1, q2, q3, q4")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      configured: Boolean(data),
      questions: data ? [data.q1, data.q2, data.q3, data.q4] : [],
    };
  });

export const saveMySecurityQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => itemsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashAnswer } = await import("@/lib/security.server");

    const email = String(context.claims?.email ?? "").toLowerCase();
    if (!email) throw new Error("Your account has no email address.");

    const [i1, i2, i3, i4] = data.items;
    const { error } = await supabaseAdmin.from("security_questions").upsert(
      {
        user_id: context.userId,
        email,
        q1: i1!.question,
        a1: hashAnswer(email, i1!.answer),
        q2: i2!.question,
        a2: hashAnswer(email, i2!.answer),
        q3: i3!.question,
        a3: hashAnswer(email, i3!.answer),
        q4: i4!.question,
        a4: hashAnswer(email, i4!.answer),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getRecoveryQuestions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email().max(255) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("security_questions")
      .select("q1, q2, q3, q4")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (!row) return { found: false as const, questions: [] as string[] };
    return { found: true as const, questions: [row.q1, row.q2, row.q3, row.q4] };
  });

export const resetPasswordWithAnswers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        answers: z.array(z.string().trim().min(1).max(120)).length(4),
        newPassword: z.string().min(8).max(72),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashAnswer, safeEqual } = await import("@/lib/security.server");

    const email = data.email.toLowerCase();
    const { data: row } = await supabaseAdmin
      .from("security_questions")
      .select("user_id, a1, a2, a3, a4")
      .eq("email", email)
      .maybeSingle();

    if (!row) throw new Error("No security questions are set for this email.");

    const stored = [row.a1, row.a2, row.a3, row.a4];
    const ok = stored.every((hash, i) => safeEqual(hash, hashAnswer(email, data.answers[i]!)));
    if (!ok) throw new Error("One or more answers are incorrect.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
