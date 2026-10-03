# 🛡️ City Shield — Frontend

> **Safer Cities. Stronger Communities.**

One-tap emergency help and civic complaints for Bengaluru. A single emergency incident record that every responding agency attaches to — instead of knowing which of eight public helplines to call.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

> ⚠️ **Prototype.** This does not dispatch real emergency services. Real dispatch
> needs an ERSS-112 integration that requires a government agreement. Responder
> positions in live tracking are simulated and labelled as such in the
> interface. **In a real emergency in India, call 112.**

---

## ✨ What It Does

- **One action raises an incident.** The citizen never picks a department — a server-side routing policy assigns a primary agency and attaches secondaries.
- **Location carries its uncertainty.** Accuracy radius and fix source are always shown, never a falsely precise pin.
- **Every agency shares one record** and can see the others on it.
- **Live tracking** shows units converging on a real map.
- **Degrades to a phone call.** No data, no GPS, no server — 112 stays one tap away on every screen, including every error state.

---

## 🛠️ Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Framework   | React 19                                        |
| Build Tool  | Vite 8                                          |
| Styling     | Tailwind CSS 3                                  |
| Routing     | React Router DOM 7                              |
| Icons       | Lucide React                                    |
| Fonts       | Public Sans · JetBrains Mono · Source Serif 4 · Instrument Serif |
| Linting     | oxlint                                          |
| Type        | Installable PWA                                 |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/Sagar-A-M/cityshield-frontend.git
cd cityshield-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at **http://localhost:5178/**

### Available Scripts

| Command                  | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `npm run dev`            | Start the Vite dev server                            |
| `npm run build`          | Build for production (with prerender & postbuild)    |
| `npm run preview`        | Preview the production build locally                 |
| `npm run lint`           | Run oxlint                                           |
| `npm test`               | Run incident tests                                   |
| `npm run prototype:build`| Rebuild the demo prototype from `prototype/src/`     |
| `npm run deploy`         | Build and deploy to GitHub Pages                     |

---

## 📁 Project Structure

```
cityshield-frontend/
├── public/
│   ├── demo/              # Self-contained interactive prototype (12 mobile screens + desktop + Command Centre)
│   │   └── index.html
│   └── sw.js              # Service worker for PWA support
├── prototype/
│   ├── src/               # Prototype source files
│   ├── build.mjs          # Build script for the demo prototype
│   └── README.md          # Prototype documentation
├── vite.config.js         # Vite configuration with demo index rewrite plugin
├── package.json
├── .oxlintrc.json         # Linter configuration
└── README.md
```

---

## 🎨 Interactive Prototype

A clickable, self-contained demo of the full citizen app lives in `prototype/` and is served alongside the main app:

- **Dev:** http://localhost:5178/demo/
- **Deployed:** https://hanishchow.github.io/cityshield/demo/

It's a single HTML file with zero dependencies and no backend. Everything in it is simulated and labelled as such. To modify:

```bash
# Edit files in prototype/src/, then rebuild:
npm run prototype:build
```

---

## ⚙️ Configuration

Copy `api/.env.example` to `api/.env` and fill in what you have (for the backend).

| Variable                          | Effect when absent                                  |
| --------------------------------- | --------------------------------------------------- |
| `MAPPLS_CLIENT_ID` / `_SECRET`    | Falls back to Ola, then a labelled stand-in         |
| `OLA_MAPS_API_KEY`                | Same chain, one step down                           |
| `DATABASE_URL`                    | In-memory store instead of Postgres + PostGIS       |
| `VITE_MAPS_API_KEY`               | Map renders as a schematic grid                     |

> **Note:** Map provider credentials live on the **server**. Every `VITE_*` variable is inlined into the browser bundle in plaintext, so anything secret must not be one.

Both halves run with **zero environment variables**. Absent credentials degrade a capability to a clearly-labelled stand-in; they never stop the app booting.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👥 Team

Built by the City Shield team for Bengaluru.

---

<p align="center">
  <strong>🛡️ City Shield</strong> — Because every second counts in an emergency.
</p>
