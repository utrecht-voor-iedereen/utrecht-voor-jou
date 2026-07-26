# Contributing to "Utrecht Voor Jou" 🇳🇱

First off, thank you for considering contributing to **Utrecht Voor Jou**! This is a 100% open-source, community-driven citizen catalog.

---

## How to Add a New Benefit (Stap voor Stap)

Adding a new benefit, grant, or free service offered by Gemeente Utrecht is as simple as editing a single JSON file!

### Step 1: Fork & Clone
1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/utrecht-voor-jou.git
   cd utrecht-voor-jou
   npm install
   ```

### Step 2: Edit `data/beneficios.json`
Open `data/beneficios.json` and append a new object to the array following this format:

```json
{
  "id": 51,
  "category": "verde",
  "type": "gratis",
  "wijk": "all",
  "verificationStatus": "verificado",
  "lastReviewed": "2026-07-26",
  "expiresSoon": false,
  "officialUrl": "https://www.utrecht.nl/...",
  "profiles": ["iedereen"],
  "title": {
    "nl": "Titel in het Nederlands",
    "en": "Title in English",
    "es": "Título en español"
  },
  "shortDescription": {
    "nl": "Korte beschrijving van de regeling...",
    "en": "Short description...",
    "es": "Descripción corta..."
  },
  "eligibility": {
    "nl": ["Inwoner van Utrecht"],
    "en": ["Resident of Utrecht"],
    "es": ["Residente en Utrecht"]
  },
  "howToApply": {
    "nl": ["Meld je aan op de officiële website"],
    "en": ["Apply on the official website"],
    "es": ["Solicítalo en la web oficial"]
  }
}
```

### Step 3: Validate & Test Locally
Run the validation and build script to ensure your JSON formatting and required fields are valid:

```bash
npm run validate
npm run build
```

Preview your changes locally:
```bash
npm run dev
# Open http://localhost:3000/nl/ in your browser
```

### Step 4: Submit a Pull Request
1. Commit your changes:
   ```bash
   git add data/beneficios.json
   git commit -m "feat: add new benefit for tree planting"
   git push origin main
   ```
2. Open a **Pull Request** on GitHub. Our automated GitHub Actions workflow will validate your JSON schema automatically!

---

## Code Structure Overview

- `data/beneficios.json`: Master JSON catalog of all benefits.
- `locales/*.json`: UI dictionaries for the 9 supported languages (`nl`, `en`, `es`, `de`, `tr`, `fr`, `it`, `pt`, `pt-BR`).
- `src/css/styles.css`: Visual identity and design system (Utrecht Red `#CC0000`, Sint Maarten diagonal motif).
- `src/svg/`: Hand-coded geometric vector illustrations (Domtoren, Bicycles, Canals, Boomspiegel).
- `scripts/build.js`: Node.js SSG generator compiling static HTML pages into `dist/`.
