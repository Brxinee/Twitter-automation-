/**
 * Pre-written tweet bank for @smell0ff — 10 tweets per pillar.
 *
 * Three content pillars — picked by day-of-week in IST:
 *   "problem" — relatable smell-anxiety moment, no product pitch, no URL
 *   "brand"   — category education, why elimination beats masking, no URL
 *   "promo"   — calm CTA, must include smelloff.in
 *
 * With 10 slots per day and 10 tweets per pool, no tweet repeats
 * within the same day. The (dayOfYear * 10 + slot) % pool.length
 * formula in daily-tweet.js handles the rotation.
 *
 * Rules every tweet must follow:
 *   - <=270 characters
 *   - No emojis, no exclamation marks, no hashtags
 *   - No banned phrases: best, #1, guaranteed, 100%, miracle, cure
 *   - problem/brand: no URLs
 *   - promo: must contain smelloff.in
 *
 * Add more tweets to any array to extend the repeat cycle.
 */

export const FALLBACK = {
  problem: [
    // 0
    "The moment you realise you are on a crowded metro and your gym bag has been sitting next to your office clothes since morning. You know. Everyone around you probably does too.",
    // 1
    "Helmet off, hair damp, about to walk into a client meeting. You give your shirt a quick check. Nothing you can do about it now. That is a Tuesday.",
    // 2
    "Date going well. You shift in your seat. The AC is not as strong on this side of the table. You keep your arms close. You are present but also very, very aware.",
    // 3
    "Three hours in the office AC and you are fine. Then you step outside for lunch and the afternoon heat hits the shirt you wore on the commute. You know what happened next.",
    // 4
    "The thing about a crowded lift is that you have about 30 seconds of very close proximity with colleagues. You spend those 30 seconds very still.",
    // 5
    "Post-gym class, still in the parking lot, about to get into an auto to the office. Bag check. Shirt check. You make a call on whether today is a close-proximity day or not.",
    // 6
    "He sat through the entire meeting with his jacket on. It was not cold. Nobody said anything. Everyone noticed.",
    // 7
    "The auto driver rolled his window down about two minutes in. You told yourself it was just the traffic.",
    // 8
    "College canteen, plastic chairs, summer afternoon, shared table with someone you are trying to impress. You ordered something cold and sat very, very straight.",
    // 9
    "Interview day. White shirt from the morning ironing. One hour on public transport. You arrive and immediately wish you had thought this through yesterday.",
  ],

  brand: [
    // 0
    "A deodorant keeps your skin dry. A perfume adds a new smell on top of the old one. Neither of these is addressing the clothes you wore on the commute. ODORSTRIKE eliminates the odor molecule itself — no layering, no masking.",
    // 1
    "Fragrance fades. The odor it was covering does not. That is why smelling fresh two hours later requires a different approach — one that removes rather than disguises. That is what ODORSTRIKE does.",
    // 2
    "Your shirt from the morning commute still holds whatever the auto ride gave it. Perfume on your wrist does nothing about that. ODORSTRIKE is for the fabric. Different product. Different logic.",
    // 3
    "Most men use a deodorant on their body and a perfume on their skin. Their clothes are doing something neither product touches. That gap is what ODORSTRIKE was built for.",
    // 4
    "A perfume does not eliminate odor. It competes with it. For about two hours. ODORSTRIKE removes the molecule causing the smell. Nothing to compete with after that.",
    // 5
    "Your clothes absorb everything — sweat, food, exhaust, the air in the room. A deodorant applied to your skin does nothing about any of that. ODORSTRIKE does.",
    // 6
    "The difference between smelling fresh and smelling like you tried to cover something up is the order of operations. ODORSTRIKE works on the source, not on top of it.",
    // 7
    "Fabric holds odor differently than skin does. It needs a different product. Not more cologne, not a second deodorant application. Something built specifically for what the fabric is carrying.",
    // 8
    "An odor-eliminating mist for clothes is a different category from everything in your bathroom shelf. One targets the molecule. The others target your nose.",
    // 9
    "People assume smell comes from the body. Sometimes it does. But after an hour of commuting, most of what people actually notice is coming from the fabric. That is a different problem.",
  ],

  promo: [
    // 0
    "ODORSTRIKE is a 50ml mist you spray on your clothes to eliminate odor — not mask it, not cover it. Pocket-sized. Works in seconds. Now available at smelloff.in",
    // 1
    "Gym bag. Commute shirt. Post-meeting jacket. ODORSTRIKE eliminates fabric odor on contact. No perfume, no cover-up — just clean. Order at smelloff.in",
    // 2
    "If your clothes carry the day before you do, ODORSTRIKE is what you need. A pocket odor-elimination mist for fabric. Available now at smelloff.in",
    // 3
    "ODORSTRIKE fits in your pocket. It works on fabric. It eliminates odor — does not layer fragrance over it. That is the product. smelloff.in",
    // 4
    "The mist you spray on your shirt before walking into a meeting. ODORSTRIKE — odor elimination for fabric. Order now at smelloff.in",
    // 5
    "50ml. Pocket-sized. Fabric odor eliminated on contact. ODORSTRIKE is launching. Pick it up at smelloff.in",
    // 6
    "If you have ever wished there was something built for your clothes specifically — not your skin, not your cologne bottle — ODORSTRIKE is it. smelloff.in",
    // 7
    "Before the next meeting. Before the date. Before you walk back into the room. ODORSTRIKE — pocket odor-eliminator for fabric. smelloff.in",
    // 8
    "The commute leaves something on your clothes. ODORSTRIKE takes it off. 50ml pocket mist, available at smelloff.in",
    // 9
    "One spray on the fabric. Odor molecule eliminated. No residue, no competing scent. ODORSTRIKE is available now — smelloff.in",
  ],
};
