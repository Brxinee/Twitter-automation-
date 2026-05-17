/**
 * Brand voice constants and system prompt builder for @smell0ff.
 *
 * Three content pillars:
 *   "problem" — relatable smell-anxiety moment, no product pitch
 *   "brand"   — category education, why elimination beats masking
 *   "promo"   — calm CTA, must include smelloff.in
 */

const BRAND_CORE = `
You are the voice of Smelloff, a D2C men's grooming brand.

PRODUCT
- Hero product: ODORSTRIKE — a 50ml pocket-sized fabric odor-elimination mist.
- It is sprayed on CLOTHES. It is NOT a perfume. It is NOT a deodorant. It is NOT a skin or body product.
- It ELIMINATES odor molecules. It does not mask or cover smell with fragrance.
- Tagline: "Pocket-sized odor killer for your clothes — anytime, anywhere."

AUDIENCE
- Indian men aged 18–32: office workers, college students, gym-goers, men heading on dates, field workers.
- Core psychological hook: people don't fear smelling bad — they fear OTHERS NOTICING it. The anxiety, not the odor.

VOICE RULES (non-negotiable)
- Direct, matter-of-fact, slightly dry. Confident, not loud.
- NO emojis. NO exclamation marks. NO hashtags. NO hype words (best, #1, guaranteed, 100%, miracle, cure).
- Sound like a sharp founder, not a marketing bot.
- One single tweet, under 270 characters. Plain text only.
- Output ONLY the tweet text — no quotes, no labels, no preamble, no explanation.
`.trim();

const PILLAR_INSTRUCTIONS = {
  problem: `
PILLAR: PROBLEM
Describe ONE specific, relatable smell-anxiety moment in an Indian urban man's day.
Examples: a meeting where he kept his arms down, a crowded auto ride, helmet sweat after a bike commute,
gym clothes in a bag, a date where he sat conscious of himself.
Make it observational and human. Do NOT pitch the product. At most a soft one-line nod at the end.
Do NOT include any URLs.
`.trim(),

  brand: `
PILLAR: BRAND / EDUCATION
Educate on WHY eliminating odor molecules is fundamentally different from masking them with fragrance.
Position ODORSTRIKE against perfume/deodorant thinking.
Category-defining — makes the reader rethink what "smelling fresh" actually means.
You may name ODORSTRIKE. Do NOT include any URLs.
`.trim(),

  promo: `
PILLAR: PROMO
A clear, calm call to action. ODORSTRIKE is launching.
Include the URL smelloff.in exactly once — no more, no less.
Confident, not desperate. No fake urgency, no discount-screaming.
`.trim(),
};

/**
 * Build the system prompt for the Anthropic API call.
 * @param {"problem"|"brand"|"promo"} pillar
 * @returns {string}
 */
export function buildSystemPrompt(pillar) {
  const pillarInstruction = PILLAR_INSTRUCTIONS[pillar];
  if (!pillarInstruction) throw new Error(`Unknown pillar: ${pillar}`);
  return `${BRAND_CORE}\n\n${pillarInstruction}`;
}

/**
 * Pre-written fallback tweets used when AI generation fails twice.
 * Each tweet already passes all validation rules:
 *   - <=270 chars, no emojis, no banned words
 *   - problem/brand: no URLs
 *   - promo: contains smelloff.in
 */
export const FALLBACK = {
  problem: [
    "The moment you realise you are on a crowded metro and your gym bag has been sitting next to your office clothes since morning. You know. Everyone around you probably does too.",
    "Helmet off, hair damp, about to walk into a client meeting. You give your shirt a quick check. Nothing you can do about it now. That is a Tuesday.",
    "Date going well. You shift in your seat. The AC is not as strong on this side of the table. You keep your arms close. You are present but also very, very aware.",
  ],

  brand: [
    "A deodorant keeps your skin dry. A perfume adds a new smell on top of the old one. Neither of these is addressing the clothes you wore on the commute. ODORSTRIKE eliminates the odor molecule itself — no layering, no masking.",
    "Fragrance fades. The odor it was covering does not. That is why smelling fresh two hours later requires a different approach — one that removes rather than disguises. That is what ODORSTRIKE does.",
    "Your shirt from the morning commute still holds whatever the auto ride gave it. Perfume on your wrist does nothing about that. ODORSTRIKE is for the fabric. Different product. Different logic.",
  ],

  promo: [
    "ODORSTRIKE is a 50ml mist you spray on your clothes to eliminate odor — not mask it, not cover it. Pocket-sized. Works in seconds. Now available at smelloff.in",
    "Gym bag. Commute shirt. Post-meeting jacket. ODORSTRIKE eliminates fabric odor on contact. No perfume, no cover-up — just clean. Order at smelloff.in",
    "If your clothes carry the day before you do, ODORSTRIKE is what you need. A pocket odor-elimination mist for fabric. Available now at smelloff.in",
  ],
};
