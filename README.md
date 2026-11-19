# Tumble — 3D Physics Playground

A mobile-first 3D physics yard. Grab pieces, throw them, and knock over towers, dominos, bowling pins, Newton's cradle, a wrecking ball, and ramps.

**Built for phones (Samsung / Android)** — open in Chrome and use **Add to Home screen** for a full-screen app.

## How to play

| Action | Control |
|--------|---------|
| Look around | Drag empty floor |
| Zoom | Pinch or scroll |
| Grab / throw | Press an object, drag, release |
| Drop a piece | Pick material + shape → **Drop** |
| Scenes | Warm-up, Tower, Dominos, Bowling, Pyramid, Cradle, Wrecking, Ramps |
| Gravity | Slider (moon → crush) |
| Slow-mo / Pause / Clear / Reset | Dock buttons |

### Materials
- **Wood** — everyday weight  
- **Rubber** — light and bouncy  
- **Metal** — heavy, hits hard  
- **Ice** — almost no friction  

## Run locally

Any static server works:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` on your phone or desktop.

CDN modules need network the first time; after that the service worker can keep it offline.

## Stack

- [three.js](https://threejs.org) — rendering  
- [cannon-es](https://github.com/pmndrs/cannon-es) — rigid-body physics  
- Vanilla HTML / CSS / JS — no build step  

## License

MIT — do what you want with it.
