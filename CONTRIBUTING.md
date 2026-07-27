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
  "searchAliases": {
    "all": ["officiële programmanaam", "organisatie", "afkorting"]
  },
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

#### About `searchAliases` (optional but valuable)

The live search only looks at the title and short description of the language
being browsed. `searchAliases` adds terms that appear in none of that text.

- `all` is for language-independent words: the official Dutch programme name,
  the organisation, the acronym. Someone told "apply for the *Witgoedregeling*"
  at the counter can then find it while reading the site in Turkish.
- A language code (`es`, `tr`, …) is for everyday words in that language that
  the title and description happen not to use.

```json
"searchAliases": {
  "all": ["witgoed", "witgoedregeling", "koelkast", "wasmachine", "u-pas"],
  "es": ["electrodoméstico", "nevera"]
}
```

Keep them lowercase. Matching is a plain substring check, so `fiets` already
covers `schoolfiets`.

#### Verify the facts, not just the format

`npm run validate` checks that the JSON is well-formed. It cannot tell whether
a benefit still exists or whether the conditions are right. Before submitting:

1. **Open `officialUrl` yourself.** It must land on the page describing the
   scheme, not a homepage or a redirect to a search. Gemeente Utrecht moves
   pages regularly, and its transactional pages live on
   `loket.digitaal.utrecht.nl` rather than `utrecht.nl`.
2. **Read the amounts and conditions off that page**, and make sure the
   eligibility and steps match it in every language you touch. A wrong
   threshold sends someone to an appointment they do not qualify for.
3. **Set `lastReviewed` to the date you did this**, not the date you wrote the
   entry. Anything older than nine months is automatically flagged on the site
   as possibly outdated.

If you cannot confirm a detail from the official source, set
`"verificationStatus": "por-verificar"` and say so in the pull request. An
honestly unverified entry is far better than a confidently wrong one.

### Step 3: Validate & Test Locally
Run the validation and build script to ensure your JSON formatting and required fields are valid:

```bash
npm run validate
npm run build
```

Check that the official sources you referenced are reachable:

```bash
npm run check-links
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
- `src/css/styles.css`: Visual identity and design system (Utrecht Red `#CC0000`, Sint Maarten diagonal motif), plus the print stylesheet.
- `src/js/`: Client-side logic. `catalog.js` holds the search, the filters and the query-string syncing; `checker.js` the wizard; `i18n-selector.js` the language switch.
- `src/sw.js`: Service worker template. `build.js` writes it to `dist/sw.js` with the build id as its cache name.
- `src/svg/`: Hand-coded geometric vector illustrations (Domtoren, Bicycles, Canals, Boomspiegel) and the installable app icon.
- `scripts/build.js`: Node.js SSG generator compiling static HTML pages into `dist/`, along with the sitemap, the RSS feeds, the manifest and the service worker.
- `scripts/check-links.js`: Requests every `officialUrl` and reports the unreachable ones. Run weekly by `link-check.yml`, which opens a GitHub issue listing them.

### A note on translations

Each of the four translated fields carries all nine languages. Two rules keep
them honest:

- **Never leave another language's text in a field.** Copying the Dutch string
  into `es` to fill the slot ships a Dutch page to Spanish readers. If you
  cannot translate it, say so in the pull request and leave the field out.
- **Keeping the Dutch term is intentional.** Entries are deliberately titled
  with the official Dutch name plus a gloss in the local language, as in
  `"Weggeefwinkel (Tienda comunitaria donde todo es gratis)"`. That is what
  someone will be asked for at the counter, so keep it.
