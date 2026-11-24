# ⏳ CHRONO SHIFT — 2D Time-Manipulation Puzzle Platformer

![Chrono Shift Banner](https://img.shields.io/badge/Chrono%20Shift-Deterministic%20Puzzle%20Platformer-00f0ff?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?style=for-the-badge&logo=vite)
![HTML5 Canvas](https://img.shields.io/badge/HTML5%20Canvas-60%20FPS-E34F26?style=for-the-badge&logo=html5)
![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Windows-green?style=for-the-badge)

**Chrono Shift** is a high-complexity, modular, and deterministic 2D puzzle-platformer built from scratch in TypeScript and HTML5 Canvas. The game challenges players to solve intricate mechanical, temporal, and spatial chambers by manipulating time itself.

---

## 🎮 Core Time Mechanics

| Mechanic | Default Key | Time Scale (World) | Time Scale (Player) | Energy Consumption | Description |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Rewind** | `Hold R` | `-1.0x` | `-1.0x` | `25 / sec` | Reverse the deterministic 600–900 frame history ring-buffer at 1x–1.5x speed. Undo lethal mistakes or create temporal paradoxes. |
| **Slow-Motion** | `Hold Shift` | `0.25x` | `0.60x` | `15 / sec` | Slow down the environment to 25% speed while maintaining 60% player mobility to slip through rapid pulse lasers and closing blast doors. |
| **Time Freeze** | `Press F / Q` | `0.00x` | `1.00x` | `35 / sec` | Completely freeze the world in place while the player moves at normal speed. Suspend opening gates and bypass pulsating hazard corridors. |
| **Echo / Ghost** | `Press E` | `1.00x` | `1.00x` | `None` | Record your movement and actions for up to 10 seconds. An ethereal hologram repeats your trajectory, holding pressure plates and occluding laser beams. |

---

## ⚡ Time-Awareness Matrix

Every entity in the engine implements the strict `ITimeAware` interface and `TimePolicy`:

| Entity Type | Rewind (R) | Slow-Motion (Shift) | Time Freeze (F) | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Player** | ✅ Restores state | 0.60x | 1.00x | Moves freely in frozen world; 1.5s "Rewind to Survive" window on lethal hit |
| **Moving Platform** | ✅ Reverses waypoints | 0.25x | 0.00x | Frozen in place during Time Freeze; carries passengers |
| **Laser Emitter & Beam** | ✅ Rewinds cycle | 0.25x | 0.00x | Raycast recalculates dynamically; occluded by boxes, Echoes, and Player |
| **Pressure Plate** | ✅ Restores state | 0.25x | Frozen state | Supports Momentary & Latched modes; triggered by Player, Echo, or Boxes |
| **Logic Door** | ✅ Rewinds open/close | 0.25x | 0.00x | Boolean logic gates (`AND`, `OR`, `XOR`); built-in anti-crush ejection |
| **Chrono Box (Normal)** | ✅ Restores position | 0.25x | 0.00x | Pushable, pickable with `E`, obeys gravity, triggers plates |
| **Chrono-Anchored Box** | ❌ **IMMUNE** | 1.00x | 1.00x | Glowing purple artifact. **Never rewinds or freezes**, enabling paradox puzzles! |
| **Echo / Ghost** | ✅ Syncs playback index | 0.25x | 0.00x | Repeats recorded timeline in a loop; rewinding rewinds playback index |

---

## 🕹️ Controls

### Keyboard Controls
- **A / D** or **Arrow Left / Right**: Run (acceleration and friction physics)
- **SPACE** or **W** or **Arrow Up**: Jump (Variable jump height, 100ms Coyote Time, 100ms Jump Buffer)
- **R (Hold)**: Rewind Time
- **Shift (Hold)**: Slow-Motion
- **F** or **Q**: Time Freeze
- **E**: Interact / Pick up & Drop Crate / Start & Stop Echo Recording
- **ESC** or **P**: Pause Menu
- **F3**: Developer Telemetry Debug Overlay (FPS, ticks, buffer fullness, hitboxes)

### Touch / Mobile Controls
- Virtual D-pad (Left / Right)
- Jump & Interact action buttons
- Dedicated `REW`, `SLO`, and `FRZ` time ability buttons

---

## 🏛️ 12 Complete Puzzle Chambers

1. **Chamber 01: First Step** *(Rewind Tutorial)* — Leap down into a deep pit to depress the switch, then hold `[ R ]` to rewind back to the top ledge before the door closes.
2. **Chamber 02: Shattered Bridge** *(Rewind)* — Cross a fast-moving bridge, activate the far latch, and rewind yourself back across the chasm to reach the upper exit.
3. **Chamber 03: Bullet Time** *(Slow-Motion Tutorial)* — Hold `[ Shift ]` to slow rapid pulsating laser barriers down to 25% speed and dash through safe intervals.
4. **Chamber 04: Pendulum** *(Slow-Mo + Moving Platforms)* — Ascend through high-speed counter-moving platforms using tactical bursts of Slow-Motion.
5. **Chamber 05: Absolute Zero** *(Time Freeze Tutorial)* — Step on a momentary pressure plate, then press `[ F ]` to freeze the rapidly closing blast gate while open.
6. **Chamber 06: Frozen Beam** *(Time Freeze + Lasers)* — Wait for lethal pulsing laser emitters to power down for 0.5 seconds, then freeze time to cross the corridor unscathed.
7. **Chamber 07: Mirror Self** *(Echo/Ghost Tutorial)* — Press `[ E ]` to record your Echo standing on Plate A, then loop it while you step on Plate B to open the AND gate.
8. **Chamber 08: Shadow Shield** *(Echo + Lasers)* — Position your Echo directly in the path of a lethal laser beam; the Echo absorbs the beam to cast a safe shadow corridor.
9. **Chamber 09: Paradox Crate** *(Chrono-Anchored Box + Rewind)* — Ride an elevator carrying the purple time-immune crate, leave it on an upper plate, and rewind yourself down to find the exit door open.
10. **Chamber 10: Clockwork Chamber** *(Slow-Mo + Freeze + Strict Budget)* — Solve three sequential pressure plates and decaying door timers under strict energy constraints.
11. **Chamber 11: Double Sync** *(Echo + Moving Platforms + Rewind)* — Record an Echo riding a mobile carrier across the abyss to trigger a distant breaker.
12. **Chamber 12: The Chrono Core** *(Finale: All Mechanics)* — Multi-tier ultimate challenge synthesizing Echo laser shields, Anchored Crate paradoxes, Time Freeze, and checkpoints to unlock the Chrono Core.

---

## 🏗️ Technical Architecture

```
chrono-shift/
├── src/
│   ├── core/
│   │   ├── GameLoop.ts            # Fixed-timestep (60 Hz) loop with max accumulator guard
│   │   ├── TimeManager.ts         # Rewind, Slow-Mo, Freeze, Energy drain & regen
│   │   ├── HistoryBuffer.ts       # Circular Ring Buffer storing 900 WorldSnapshots
│   │   ├── InputManager.ts        # Input buffering (100ms), Coyote time, and touch bindings
│   │   └── SoundManager.ts        # Procedural Web Audio API sound synthesizer
│   ├── physics/
│   │   ├── AABB.ts                # AABB collision separation & 2D raycasting math
│   │   └── PhysicsWorld.ts        # Move-and-slide collision resolution with static solids
│   ├── entities/
│   │   ├── BaseEntity.ts          # ITimeAware interface and TimePolicy contracts
│   │   ├── Player.ts              # Kinematic controller, coyote time, variable jump, carrying
│   │   ├── EchoGhost.ts           # Movement recording, looping playback, laser occlusion
│   │   ├── MovingPlatform.ts      # Multi-waypoint platform with pause intervals
│   │   ├── PressurePlate.ts       # Momentary and Latched pressure switches
│   │   ├── LaserEmitter.ts        # Continuous & pulsating raycast lasers
│   │   ├── Door.ts                # AND / OR / XOR logic doors with anti-crush ejection
│   │   ├── ChronoBox.ts           # Pushable standard boxes & purple Chrono-Anchored boxes
│   │   └── Checkpoint.ts          # Checkpoints with history boundary lock
│   ├── levels/
│   │   ├── LevelSchema.ts         # TypeScript schema definitions for levels
│   │   ├── LevelLoader.ts         # Instantiates level entities and clears old buffers
│   │   ├── PuzzleValidator.ts     # Gate logic evaluation and exit detection
│   │   └── data/                  # level_01.json ... level_12.json & index.ts
│   ├── ui/
│   │   ├── HUD.ts                 # Time meter, Rewind timeline, Chamber objective
│   │   ├── Menus.ts               # Main Menu, Chamber Select, Pause, Victory screen
│   │   ├── TutorialOverlay.ts     # Diegetic floating world prompts
│   │   ├── DebugView.ts           # F3 Telemetry HUD, hitbox outlines, velocity vectors
│   │   └── VFXManager.ts          # VHS rewind scanlines, slowmo vignette, frost border
│   ├── storage/
│   │   └── SaveManager.ts         # LocalStorage persistence for stars, best times, unlocks
│   └── main.ts                    # Entry point & game coordinator
├── electron/
│   └── main.cjs                   # Desktop wrapper for Windows executable packaging
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (tested on Node v24)
- npm or pnpm

### Installation
```bash
git clone https://github.com/javohirshokirjonov58-spec/Chrono-shift.git
cd Chrono-shift
npm install
```

### Run Web Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Production Web Build
```bash
npm run build
npm run preview
```
Output files are generated in `dist/`.

### Run Desktop Windows App (Electron)
```bash
npm run electron:dev
```

---

## 🛡️ Edge Cases & QA Handled

- **Rewind Anti-Crush / Stuck Prevention**: Moving doors calculate separation vectors (`resolveCrush`) and eject the player safely if closing on release.
- **Rewind to Survive (Lethal Hit Window)**: When fried by lasers or falling, a 1.5-second emergency window opens with a warning pulse. Holding `[ R ]` rewinds before the lethal hit and restores the player to life!
- **Clean Scene Transitions**: Loading a new chamber clears old buffers, active timers, audio loops, and Echo recordings to eliminate cross-level memory leaks.
- **Circular Ring Buffer Safety**: O(1) fixed-memory circular array prevents memory allocation churn and guarantees zero out-of-bounds errors even when rewinding immediately at tick 0.
- **Deterministic Checkpoint Boundary**: Activating a checkpoint locks the buffer boundary so rewinding cannot retreat prior to the active checkpoint.

---

## 📜 License
MIT License. Developed for Chrono Shift.
