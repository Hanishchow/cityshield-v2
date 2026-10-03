# City Shield — pitch prototype

A single-file, fully clickable prototype of the citizen app, built for
stakeholder demos. It needs no build tools, no backend and no API keys.

- **Mobile (< 960px):** the 12 screens from the design — Home, Emergency SOS,
  Ambulance / Police / Fire / GBA live tracking, Report a Complaint, Complaint
  Details, Language & Preferences, Profile, Saved Locations, Notifications —
  plus Help, About and a Track hub.
- **Desktop (≥ 960px):** sidebar layout, two-column service pages with a large
  live map, and a Command Centre (government view, sample data).
- English, ಕನ್ನಡ, हिंदी, தமிழ், తెలుగు for the main UI labels. Light and dark themes.

## What is real and what is simulated

Simulated, and labelled in the UI: responder positions and ETAs (run at demo
speed), officer details, the camera feed, calls and video calls, hospital bed
availability and every Command Centre figure. The only real action is dialling
a helpline (112 / 100 / 101 / 108), which always asks for confirmation first.
State lives in memory and resets on reload; only the theme choice is saved.

BBMP was replaced by the Greater Bengaluru Authority on 2 Sept 2025, so the
civic body is shown as **GBA**. It is one constant (`CIVIC` in `src/core.js`).

## Layout

```
src/styles.css, extra.css   design tokens, mobile + desktop layout
src/core.js                 icons, i18n strings, sample data, state
src/art.js                  SVG artwork (hero, logo, photos, officer)
src/map.js                  SVG city map + live-tracking simulation
src/pages_a.js, pages_b.js  every screen, mobile and desktop variants
src/app.js                  shell, router, actions, overlays
build.mjs                   inlines everything into public/demo/index.html
```

## Working on it

```bash
npm run prototype:build   # regenerate public/demo/index.html
npm run dev               # then open http://localhost:5178/demo/
```

The React app is untouched. The service worker skips `/demo/` so the prototype
never overwrites the app's cached shell.
