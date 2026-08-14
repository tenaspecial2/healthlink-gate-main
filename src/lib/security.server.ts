import { createHash } from "crypto";

/** Normalise then hash an answer so raw answers are never stored. */
export function hashAnswer(email: string, answer: string): string {
  const normalized = answer.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(`${email.trim().toLowerCase()}|${normalized}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
