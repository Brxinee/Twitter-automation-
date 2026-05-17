/**
 * Pre-written tweet bank for @smell0ff.
 *
 * Rotation: (pillarDayIndex * 2 + slot) % pool.length
 *   — pillarDayIndex counts only days this pillar was active, so every
 *     tweet in the pool gets posted and nothing is skipped.
 *
 * Content calendar:
 *   problem — Mon / Tue / Wed / Sat  (4 days/week)
 *   brand   — Thu / Sun              (2 days/week)
 *   promo   — Fri                    (1 day/week)
 *
 * Months of content before any tweet repeats:
 *   problem: 40 tweets → 20 problem-days → 35 calendar days ≈ 5 weeks
 *   brand:   20 tweets → 10 brand-days   → 35 calendar days ≈ 5 weeks
 *   promo:   10 tweets → 5 promo-days    → 35 calendar days ≈ 5 weeks
 *   All pillars sync to the same ~5-week cycle.
 *
 * Rules every tweet must follow:
 *   <=270 chars · no emojis · no exclamation marks · no hashtags
 *   no banned phrases: best, #1, guaranteed, 100%, miracle, cure
 *   problem/brand: no URLs · promo: must contain smelloff.in
 *
 * Add more tweets to any array to extend the repeat cycle proportionally.
 */

export const FALLBACK = {

  // -------------------------------------------------------------------------
  // PROBLEM — 40 tweets
  // Specific, relatable smell-anxiety moments. Observational, dry.
  // No product pitch. No URL.
  // -------------------------------------------------------------------------
  problem: [
    // 0
    "You shower. Deodorant on. Put on the shirt from Monday. Step out. By 11 AM you realise the shower handled your body. Nobody handled the shirt.",
    // 1
    "There is a specific kind of confidence that disappears the moment you sit in an auto for 20 minutes in May and then have to walk into an interview.",
    // 2
    "The meeting ran long. The room had no windows. There were six of you. By the end everyone was very carefully not looking at each other.",
    // 3
    "She asked you to pass the file. You reached across. You sat back down. The next 40 minutes involved you being very conscious of the distance between your elbow and your torso.",
    // 4
    "Your gym bag has been in the car since Tuesday. You are aware of this. The cab driver is also aware of this.",
    // 5
    "Helmet off. Hair pressed flat. Shirt damp at the collar. First impression situation. You straighten your back and walk in anyway.",
    // 6
    "The Ola pool ride had four people. You were the second pickup. The third person got in and immediately rolled down the window. You have thought about it since.",
    // 7
    "Date ending. You go in for the hug goodbye. She turns slightly. Quick side-hug. Shorter than expected. You replay it on the way home.",
    // 8
    "You have been in the office since 9. It is now 5. Team dinner in an hour. You spend fifteen minutes calculating what you can do in one hour with no shower option.",
    // 9
    "Crowded college corridor, afternoon, walking next to someone you like. You are thinking about your shirt. Not the conversation. The shirt.",
    // 10
    "Post-gym bag under the office desk. You told yourself no one could smell it from there. You were wrong about where people's noses are relative to the floor.",
    // 11
    "The wedding season hits different when you are in a sherwani for six hours at an outdoor venue in March. You spend the reception calculating proximity to relatives.",
    // 12
    "Company bus. AC not working. An hour fifteen minutes. You arrive at the client site. The presentation is in ten minutes. This is how you learned to keep a spare shirt.",
    // 13
    "You wore the jersey to a friend's place for the match. Two hours in, the game was tied. Three of you were leaning forward on the same couch. Nobody mentioned it.",
    // 14
    "Morning sprint to the metro. Caught it by two seconds. Stood in the corner. Kept your arms down. Arrived. Regretted not leaving five minutes earlier.",
    // 15
    "Internship. Open office. Your desk is next to the senior manager's. You have been there since 9. It is summer. The AC is on the other side of the room.",
    // 16
    "There is a gym near the office. You go before work. You tell yourself you have time to shower and commute. You are almost always wrong about this.",
    // 17
    "First Ola rating below 4.5. No comment. No context. You knew.",
    // 18
    "The presentation was online. Video-on. You were in the same shirt you slept in. You did not think about this until the meeting started.",
    // 19
    "Board exam hall. Forty students. One room. May. Ceiling fans. You arrived early and got the center seat. There was nowhere to go for three hours.",
    // 20
    "You ordered a coffee on the date to give yourself something to do with your hands. The coffee was hot. The room was warm. You held the cup anyway.",
    // 21
    "Sunday laundry. You wash everything. Monday morning you discover you did not wash the shirt you planned to wear. You wear the one from last Thursday anyway.",
    // 22
    "The lift opened. You stepped in. The person already inside looked at the floor number. Then at you. Then at the floor number again. Four more floors.",
    // 23
    "Outdoor meeting with a client. Standing. Afternoon. You kept shifting your weight so no one side of you was too close to anyone for too long.",
    // 24
    "Your bag smells like lunch and gym clothes and last week. You carry it into every meeting. You have never thought about this until now.",
    // 25
    "She is telling you something important. You are nodding. You are also calculating the direction of the ceiling fan and adjusting your posture accordingly.",
    // 26
    "New city, new job, one set of friends. They want to go out after work. You have been in the office nine hours. You go. You calculate distances on the way.",
    // 27
    "Group photo at the end of the trek. Eight people. You are in the middle. The photographer asks everyone to put their arms around each other. You smile.",
    // 28
    "You took a cab instead of the metro because it was faster. It was not faster. It took 40 minutes in traffic. You arrived tense and warm. The meeting had already started.",
    // 29
    "Standing in the queue outside the club. Summer night, still 32 degrees, no wind. Forty-five minutes. Your shirt was new this evening. It was not new by the time you got in.",
    // 30
    "The teacher called you to the front. You walked up in a full room in the middle of a hot afternoon and raised your hand to write on the board.",
    // 31
    "You reapplied deodorant in the office bathroom. Sprayed it on your skin. Walked back to your desk. Your shirt is still the same shirt it was this morning.",
    // 32
    "Post-lunch meeting. No ventilation. Seven people. Whoever booked that room did not think about what happens to a closed room after seven people sit in it for an hour.",
    // 33
    "You are on the video call. Camera on. Day three of working from home. You have not thought about your shirt in three days. Someone unmutes and you instinctively look down.",
    // 34
    "Mumbai summer, 3 PM, no AC in the auto, stuck in traffic outside Dadar, forty-five minutes, window seat gone. You are just there. Processing.",
    // 35
    "The client walked in early. You had been setting up since 8 AM. The room had no windows. Two-hour meeting. You were standing closest to the vent.",
    // 36
    "You have been wearing the same jacket all winter. It is now March. Too warm for a jacket. You keep wearing it anyway.",
    // 37
    "The flight was delayed 90 minutes. You waited at the gate. No ventilation. 140 people, 90 minutes. Nobody was happy about the physics of this.",
    // 38
    "Speed dating event. Two minutes per person. Someone across the table. They are being evaluated. So are you. You become very aware of the gap between the chairs.",
    // 39
    "You woke up late. Shower skipped. Dry shampoo in the hair. Deodorant reapplied over last night's. You walked out. You are managing perception, not reality.",
  ],

  // -------------------------------------------------------------------------
  // BRAND — 20 tweets
  // Category education: eliminating vs masking. Can name ODORSTRIKE. No URL.
  // -------------------------------------------------------------------------
  brand: [
    // 0
    "A deodorant keeps your skin dry. A perfume adds a new smell on top of the old one. Neither is addressing the clothes you wore on the commute. ODORSTRIKE eliminates the odor molecule — no layering, no masking.",
    // 1
    "Fragrance fades. The odor it was covering does not. Smelling fresh two hours later requires a different approach — one that removes rather than disguises. That is what ODORSTRIKE does.",
    // 2
    "Your shirt from the morning commute holds whatever the auto ride gave it. Perfume on your wrist does nothing about that. ODORSTRIKE is for the fabric. Different product. Different logic.",
    // 3
    "Most men use a deodorant on their body and a perfume on their skin. Their clothes are doing something neither product touches. That gap is what ODORSTRIKE was built for.",
    // 4
    "A perfume does not eliminate odor. It competes with it. For about two hours. ODORSTRIKE removes the molecule causing the smell. Nothing to compete with after that.",
    // 5
    "Your clothes absorb everything — sweat, food, exhaust, the air in the room. A deodorant applied to your skin does nothing about any of that. ODORSTRIKE does.",
    // 6
    "The difference between smelling fresh and smelling like you tried to cover something up is the order of operations. ODORSTRIKE works on the source, not on top of it.",
    // 7
    "Fabric holds odor differently than skin. It needs a different product. Not more cologne, not a second deodorant. Something built specifically for what the fabric is carrying.",
    // 8
    "An odor-eliminating mist for clothes is a different category from everything in your bathroom shelf. One targets the molecule. The others target your nose.",
    // 9
    "People assume smell comes from the body. Sometimes it does. But after an hour of commuting, most of what people actually notice is coming from the fabric. That is a different problem.",
    // 10
    "You shower. Apply deodorant. Put on a shirt that still holds something from the last time you wore it. You walk out thinking you are clean. One of those steps did not do what you think.",
    // 11
    "Cologne was designed to smell good on skin. It was not designed for fabric. When you spray it on your shirt, you are using the wrong product for the job.",
    // 12
    "There are two ways to deal with a smell: remove the source or add something louder. One of these is solving the problem. ODORSTRIKE removes the source.",
    // 13
    "Your gym clothes do not need more perfume. They need the odor removed. Two different problems. Two different products.",
    // 14
    "Washing a shirt removes the surface. Fabric fibers hold more than surface. That is why the shirt you washed last night still has something to it by noon.",
    // 15
    "The category is called odor elimination. Most products in your bathroom are odor masking. ODORSTRIKE is in the first category.",
    // 16
    "People have been trained to think smell equals perfume. So they buy more perfume. The shirt keeps doing what it has always been doing. No one made a product for the shirt. Until ODORSTRIKE.",
    // 17
    "Deodorant prevents sweat odor on your underarms. It does nothing for the shirt that absorbed that heat all day. Different surface, different solution.",
    // 18
    "The reason a second application of cologne does not solve the problem is that you are adding to it, not removing it. ODORSTRIKE removes it.",
    // 19
    "An odor molecule is not impressed by fragrance. It stays. A neutralizing agent formulated for fabric removes it. That is the difference between a perfume and ODORSTRIKE.",
  ],

  // -------------------------------------------------------------------------
  // PROMO — 10 tweets
  // Calm CTA. Must contain smelloff.in exactly once.
  // -------------------------------------------------------------------------
  promo: [
    // 0
    "ODORSTRIKE is a 50ml mist you spray on your clothes to eliminate odor — not mask it, not cover it. Pocket-sized. Works in seconds. Now available at smelloff.in",
    // 1
    "Gym bag. Commute shirt. Post-meeting jacket. ODORSTRIKE eliminates fabric odor on contact. No perfume, no cover-up — just clean. Order at smelloff.in",
    // 2
    "If your clothes carry the day before you do, ODORSTRIKE is what you need. A pocket odor-elimination mist for fabric. Available now at smelloff.in",
    // 3
    "ODORSTRIKE fits in your pocket. Works on fabric. Eliminates odor — does not layer fragrance over it. That is the product. smelloff.in",
    // 4
    "The mist you spray on your shirt before walking into a meeting. ODORSTRIKE — odor elimination for fabric. Order now at smelloff.in",
    // 5
    "50ml. Pocket-sized. Fabric odor eliminated on contact. ODORSTRIKE is launching. Pick it up at smelloff.in",
    // 6
    "If you have ever wished there was something built for your clothes — not your skin, not your cologne bottle — ODORSTRIKE is it. smelloff.in",
    // 7
    "Before the next meeting. Before the date. Before you walk back into the room. ODORSTRIKE — pocket odor-eliminator for fabric. smelloff.in",
    // 8
    "The commute leaves something on your clothes. ODORSTRIKE takes it off. 50ml pocket mist, available at smelloff.in",
    // 9
    "One spray on the fabric. Odor molecule eliminated. No residue, no competing scent. ODORSTRIKE is available now — smelloff.in",
  ],
};
