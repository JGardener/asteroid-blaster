# Asteroid Blaster — Domain Glossary

A shared vocabulary for this codebase. Implementation details do not belong here.

---

## Wave
A set of asteroids spawned at the start of a level. A wave is **cleared** when every asteroid has been destroyed. Clearing a wave triggers a Level Transition.

## Level
A counter that increments after each Wave is cleared. Drives asteroid count, movement speed, UFO frequency, UFO shot accuracy, and music arpeggio intensity. Starts at 1.

## Level Transition
The ~1.5-second pause between a cleared Wave and the next Wave spawn. Displays a "LEVEL X" title card and plays a sound cue. The game loop is frozen for its duration.

## Pickup
A collectible entity that drifts on the canvas after being dropped by a destroyed large asteroid. Exactly one large asteroid per Wave is designated to drop a Pickup. The player collects it by flying the ship into it. Collecting a Pickup replaces any currently active Power-up.

## Power-up
The active effect granted to the ship by collecting a Pickup. Only one Power-up can be active at a time. There are three types: **Shield**, **Spread Shot**, and **Rapid Fire**. Weapon power-ups (Spread Shot, Rapid Fire) expire after 10 seconds. Shield persists until it absorbs a hit.

## Shield
A Power-up that manifests as a visible wireframe ring drawn around the ship. Absorbs the next asteroid collision or UFO bullet hit in place of losing a life. Destroyed on absorption.

## Spread Shot
A Power-up that replaces the ship's default single bullet with a 3-bullet spread. Active for 10 seconds. Communicated to the player via the ship's visual (wider nose geometry) rather than a HUD element.

## Rapid Fire
A Power-up that reduces the ship's fire cooldown. Active for 10 seconds. Communicated to the player via a brighter thruster flame rather than a HUD element.

## UFO
An enemy entity distinct from asteroids. Enters the play area from a screen edge, fires aimed bullets at the ship, then exits from the opposite edge. Worth 500 points. Does not split or drop Pickups. First appears at level 3; frequency increases with level; shot accuracy tightens with level.

## Asteroid
An environmental hazard that moves in a straight line and wraps at screen edges. Comes in three sizes (large, medium, small). Destroyed by a Bullet or UFO bullet; large and medium asteroids split into two smaller asteroids on destruction. Only large asteroids can drop a Pickup.
