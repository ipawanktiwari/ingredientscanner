# Ingredient Scanner 🥫

**Scan barcodes → See ingredients → Get a health rating → Understand what you're eating.**

A cross-platform mobile app (Android + iOS) built with React Native (Expo) that uses the [Open Food Facts](https://world.openfoodfacts.org/) public database to provide instant ingredient analysis, health ratings, and consumer-awareness information for packaged food products.

---

## Features

- **📸 Barcode Scanning** — Point your camera at any product barcode (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, ITF-14)
- **🔍 Instant Product Lookup** — Fetches product name, brand, images, quantity from Open Food Facts
- **⭐ Health Rating (0–5)** — Multi-factor scoring based on:
  - **Nutri-Score** (25%) — Official nutritional quality grade (A–E)
  - **NOVA Processing Level** (20%) — How ultra-processed is the food (1–4)
  - **Additive Quality** (20%) — Penalizes high-risk chemical additives
  - **Nutritional Profile** (20%) — Sugar, salt, saturated fat, fiber, protein
  - **Ingredient Quality** (15%) — Short lists with whole foods score higher
- **📋 Full Ingredient Breakdown** — Every ingredient listed with estimated percentages, flagged additives
- **⚠️ Additive Safety Analysis** — 300+ additive database with EFSA/FDA safety ratings: Low, Moderate, High Concern
- **🧠 Consumer Awareness Excerpts** — Plain-English explanations of what each finding means for you
- **🥜 Allergen Detection** — Highlights milk, eggs, peanuts, tree nuts, soy, gluten, fish, shellfish, sesame, sulphites
- **📜 Scan History** — Persistent local storage of all past scans

---

## Screenshots

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│         Scanner              │  │      Product Analysis       │
│                              │  │                             │
│    ┌───────────────────┐     │  │  ╭───╮  Product Name        │
│    │                   │     │  │  │IMG│  Brand • Quantity     │
│    │    ┌──┐           │     │  │  ╰───╯                      │
│    │    │  │  ═══════  │     │  │     ★ 3.8 / 5.0             │
│    │    └──┘           │     │  │     Good                    │
│    │                   │     │  │                             │
│    └───────────────────┘     │  │  ┌──────────────────────┐   │
│                              │  │  │ ⚠️ High Sugar Alert  │   │
│   Point camera at barcode    │  │  └──────────────────────┘   │
│         [🔦] [📜]            │  │                             │
└─────────────────────────────┘  │  [Summary│Ingredients│Adds] │
                                  │                             │
                                  └─────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.76 + Expo SDK 52 |
| Language | JavaScript (ES6+) |
| Navigation | React Navigation 7 (Stack) |
| Barcode Scanning | expo-camera (built-in barcode scanner) |
| Product Database | Open Food Facts API (free, public, no auth) |
| Local Storage | AsyncStorage (scan history) |
| Bundler | Metro |
| Build | EAS Build / Expo Go |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- (Optional) **Android Studio** or **Xcode** for native builds

### Installation

```bash
# Clone the repo
git clone https://github.com/objectifylab/ingredientscanner.git
cd ingredientscanner

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Run on Your Phone

1. Install **Expo Go** on your phone
2. Scan the QR code shown in the terminal (or in the browser at `http://localhost:8081`)
3. The app loads instantly — no build step needed

### Run on Emulator

```bash
# Android emulator (Android Studio required)
npx expo start --android

# iOS simulator (macOS + Xcode required)
npx expo start --ios
```

---

## Building for Production

### Android APK/AAB (using EAS Build)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

### iOS IPA (requires Apple Developer account)

```bash
eas build --platform ios --profile production
```

### Standalone APK (no EAS — classic Expo)

```bash
expo build:android
expo build:ios
```

---

## Project Structure

```
ingredientscanner/
├── App.js                      # Root — navigation setup
├── app.json                    # Expo configuration (permissions, plugins)
├── package.json                # Dependencies
├── babel.config.js             # Babel + Reanimated plugin
├── assets/
│   └── icon.png                # App icon
├── src/
│   ├── screens/
│   │   ├── ScannerScreen.js    # Camera-based barcode scanner
│   │   ├── ProductScreen.js    # Product details, rating, ingredients
│   │   └── HistoryScreen.js    # Past scan history
│   ├── services/
│   │   ├── api.js              # Open Food Facts API client + additive DB
│   │   └── scoring.js          # Rating engine + awareness excerpts
│   ├── components/
│   │   ├── IngredientCard.js   # Additive detail card with risk badge
│   │   └── RatingBadge.js      # Circular score display
│   └── utils/
│       └── storage.js          # AsyncStorage CRUD for history
└── .gitignore
```

---

## How Scoring Works

The overall rating (0.0–5.0) is computed from five weighted dimensions:

| Dimension | Weight | How It's Scored |
|-----------|--------|-----------------|
| **Nutri-Score** | 25% | A=25, B=20, C=13, D=6, E=0 |
| **NOVA Group** | 20% | 1 (unprocessed)=20, 2=15, 3=8, 4 (ultra-processed)=0 |
| **Additives** | 20% | Base 20, −2 per high-risk, −1 per moderate, −0.5 per low |
| **Nutrition** | 20% | Penalizes high sugar/salt/sat-fat; rewards fiber/protein |
| **Ingredients** | 15% | Short lists + whole foods = high; long lists + sugar first = low |

---

## API Data Source

This app uses the **[Open Food Facts](https://world.openfoodfacts.org/)** public database — a free, open, collaborative database of food products from around the world.

- **API docs:** https://world.openfoodfacts.org/api/v2
- **Rate limits:** 10 req/sec (permissive for normal usage)
- **No API key required**

The additive safety database is curated from:
- **EFSA** (European Food Safety Authority) re-evaluations
- **FDA GRAS** (Generally Recognized as Safe) list
- **Codex Alimentarius**
- **IARC** carcinogen classifications
- Published research on additive health effects

---

## Permissions

### Android
- `android.permission.CAMERA` — for barcode scanning

### iOS
- `NSCameraUsageDescription` — for barcode scanning

These are declared automatically via the `expo-camera` plugin in `app.json`.

---

## License

MIT © Objectify Lab

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## Disclaimer

This app provides informational ratings based on publicly available data and established nutritional guidelines. It is **not** medical advice. Always consult a qualified healthcare professional for dietary decisions. The additive safety database is compiled from regulatory sources but may not be exhaustive.
