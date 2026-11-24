# Chrono Shift — Game Design Document (GDD)

## 1. Executive Summary
- **Game Title**: Chrono Shift
- **Genre**: 2D Deterministic Time-Manipulation Puzzle Platformer
- **Target Audience**: Fans of *Braid*, *Portal*, *Celeste*, and puzzle platformers.
- **Target Platforms**: Web (HTML5 Canvas / Vite) & Windows Desktop (Electron).
- **Core Loop**: Enter chamber -> Analyze temporal obstacles -> Manipulate time (Rewind / Slow-Mo / Freeze / Echo) -> Open security doors -> Reach the Chrono Exit Portal.

---

## 2. Core Mechanics Breakdown

### 2.1 Deterministic 60 Hz Physics Engine
- Unlike non-deterministic physics engines (Box2D, Matter.js) where floating-point drift disrupts rewinding, Chrono Shift uses a custom fixed-timestep AABB engine.
- Every state variable (position, velocity, flags, timers) is recorded every 16.66ms into a 900-frame circular ring buffer (15 seconds total capacity).

### 2.2 Time Powers & Resource Consumption
- **Max Energy**: 100 units (up to 120 in Chamber 12).
- **Rewind**: 25 units/second. Reverses time playback.
- **Slow-Motion**: 15 units/second. 0.25x world speed, 0.60x player speed.
- **Time Freeze**: 35 units/second. 0.00x world speed, 1.00x player speed.
- **Regeneration**: In standard mode, regenerates at 10 units/s after a 1.5s delay. In Strict Budget chambers, energy does not regenerate.

### 2.3 Echo / Ghost System
- Player records up to 10 seconds of actions with `[ E ]`.
- A translucent hologram replays position, facing, and interact states.
- The Echo can trigger pressure plates and physically occlude laser beams.
- Rewinding smoothly winds back the Echo playback counter in lockstep.

### 2.4 Chrono-Anchored Objects (Purple)
- Normal objects restore their history when rewound.
- Chrono-Anchored objects have `isImmune = true`. They ignore rewind, slow-motion, and freeze commands, allowing the player to manipulate the future, move an anchored box, and rewind themselves to a previous position while the box remains in place!

---

## 3. Visual & Audio Style
- **Aesthetic**: Cyberpunk minimal chrono-facility with neon cyan (`#00f0ff`), chrono amber (`#ffaa00`), freeze icy white (`#c742ff`), and lethal red lasers (`#ff3366`).
- **Audio**: Procedural Web Audio API synthesis without external file dependencies, ensuring 0ms latency and instantaneous cross-platform playability.
