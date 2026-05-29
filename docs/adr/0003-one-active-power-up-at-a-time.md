# One active power-up at a time; new pickup replaces old

The ship can hold exactly one active Power-up. Collecting a second Pickup immediately replaces the first, regardless of type or remaining duration.

This constraint exists to create a genuine decision moment: when a new Pickup appears, the player must evaluate whether it is worth more than what they currently hold. Allowing stacking removes that tension and turns Pickups into pure reward. The constraint also keeps the ship's visual state unambiguous — one extra visual (ring, wider nose, or bright thruster) is readable; three simultaneous overlays are not.

The Shield is not special-cased. Although it is the only Power-up with no fixed expiry, it obeys the same replacement rule. This keeps the mental model uniform.

## Considered options

- **All three slots active simultaneously** — rejected because it eliminates decision tension and allows a fully-powered state that trivialises the early levels.
- **Shield stacks with weapon pickups, weapons are mutually exclusive** — rejected because it introduces an inconsistency (why does Shield behave differently?) that requires explanation without UI labels.
