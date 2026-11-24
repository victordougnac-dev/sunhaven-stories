# Sunhaven Stories — Open-World 3D Coastal Metropolis

An original 3D open-world browser game built with **Three.js**, **TypeScript**, **Vite**, procedural PBR textures, and Web Audio synthesis — tailored for **CrazyGames**.

## Features

- **12 Distinct Districts across Sunhaven**: Downtown Sunhaven, Central Palm Park, Bayside Promenade, Palm Beach, Neon Mile, Sunhaven Marina, Harbor Port & Industrial, Sunset Suburbs, Coral Heights, Sunhaven International Airport, Emerald Hills, and Coral Cove Secret Island.
- **14 Enterable Buildings & Interiors**: Cafes, markets, nightclubs, apartments, villas, surf shop, garage, warehouse, airport terminal, lighthouse cottage, underground metro bunker, and the Apex Rooftop Skybar elevator.
- **Vehicles & Boats**: Sports cars, sedans, SUVs, pickup trucks, leaning motorcycles, delivery vans, speedboats, and a secret prototype hypercar with suspension, steering, headlights, brake lights, and handbrake drifting.
- **Flyable Aircraft**: Propeller plane, private business jet, and flyable helicopter stationed at Sunhaven International Airport.
- **Living City**: 40+ animated NPCs with sidewalk routines and interactive dialogue, plus autonomous road traffic obeying intersection traffic signals.
- **Dynamic Day/Night & Weather**: 24-hour sun/moon cycle, starfield, night building illumination, streetlamps, tropical rain, wet reflective asphalt, and thunderstorms.
- **5 Optional Activities & 16 Easter Eggs**: Street races, delivery runs, aerial sky rings, speedboat slalom, landmark photo safari, and 16 hidden secrets with an interactive pan-and-zoom city map (`M`).
- **CrazyGames Ready**: Lightweight ~180 kB gzipped bundle, `CrazyGamesManager` SDK v3 wrapper with offline fallback, quality presets (`Low` / `Medium` / `High` / `Ultra`), local save persistence, and fullscreen support.

## Controls

| Action | Keys |
| --- | --- |
| Move | `W A S D` |
| Sprint | `SHIFT` |
| Jump / Swim Up | `SPACE` |
| Interact / Enter Building / Talk | `E` |
| Enter / Exit Vehicle or Aircraft | `F` |
| Photo Camera Mode / Snap | `C` / `Left Click` |
| City Map | `M` |
| Horn / Headlights (Driving) | `H` / `L` |
| Aircraft Throttle / Rudder | `SHIFT` / `CTRL` & `Q` / `E` |
| Pause Menu | `ESC` |

## Development & CrazyGames Build

```bash
npm install
npm run dev      # Local dev server
npm run build    # Outputs CrazyGames-ready static bundle to dist/
```

To upload to CrazyGames, zip the contents of `dist/` after running `npm run build`.
