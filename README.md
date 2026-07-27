# 🏰 Utrecht Voor Jou

![Build & Deploy](https://github.com/utrecht-voor-iedereen/utrecht-voor-jou/actions/workflows/deploy.yml/badge.svg)
![Link Check](https://github.com/utrecht-voor-iedereen/utrecht-voor-jou/actions/workflows/link-check.yml/badge.svg)
![License EUPL-1.2](https://img.shields.io/badge/license-EUPL--1.2-red.svg)
![i18n 9 Languages](https://img.shields.io/badge/i18n-9%20languages-blue.svg)
![GitHub Pages](https://img.shields.io/badge/hosting-GitHub%20Pages-success.svg)

> **Utrecht Voor Jou** is een 100% open-source, meertalig en onafhankelijk burgerinitiatief dat tientallen gratis regelingen, subsidies, vergoedingen en voorzieningen van de Gemeente Utrecht inzichtelijk maakt.

🌐 **Live Website**: [https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/)

---

## 🌍 Directe Links per Taal / Direct Links by Language (9 Languages)

Elke taalversie is direct toegankelijk via de onderstaande links:

| Vlag | Taal (Language) | Code | Directe Link |
| :---: | :--- | :---: | :--- |
| 🇳🇱 | **Nederlands** | `nl` | [Bekijk in het Nederlands](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/nl/) |
| 🇬🇧 | **English** | `en` | [View in English](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/en/) |
| 🇪🇸 | **Español** | `es` | [Ver en Español](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/es/) |
| 🇩🇪 | **Deutsch** | `de` | [Auf Deutsch ansehen](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/de/) |
| 🇹🇷 | **Türkçe** | `tr` | [Türkçe olarak görüntüle](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/tr/) |
| 🇫🇷 | **Français** | `fr` | [Voir en Français](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/fr/) |
| 🇮🇹 | **Italiano** | `it` | [Visualizza in Italiano](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/it/) |
| 🇵🇹 | **Português** | `pt` | [Ver em Português](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/pt/) |
| 🇧🇷 | **Português (Brasil)** | `pt-BR` | [Ver em Português do Brasil](https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/pt-BR/) |

---

## 🌟 Kenmerken / Key Features

- **9 Talen vanaf dag 1**: Nederlands (`nl`), Engels (`en`), Spaans (`es`), Duits (`de`), Turks (`tr`), Frans (`fr`), Italiaans (`it`), Portugees (`pt`), Portugees van Brazilië (`pt-BR`).
- **Interactive "Heb ik recht?" Checker**: 4-vragen wizard tool die 100% client-side werkt in de browser. Geen dataverzameling, geen cookies, geen privacyzorgen.
- **Geverifieerde Regelingen**: Verdeeld over 8 categorieën (Groen & Natuur, Geld & Subsidies, Energie & Wonen, Recht & Regelzaken, Cultuur & Vrije Tijd, Mobiliteit, Gemeenschap & Circulair, Dagelijks Leven).
- **Deelbare filters**: de zoekterm en de vier filters staan in de query string. Een gefilterd overzicht (`?type=gratis&wijk=Overvecht`) is dus een link die je kunt doorsturen, en de terugknop maakt één filter ongedaan in plaats van de pagina te verlaten.
- **Zoeken op de Nederlandse term**: elke regeling heeft `searchAliases` met de officiële programmanaam, de organisatie en de afkorting. Wie aan het loket "Witgoedregeling" of "BghU" hoort, vindt de regeling terug ongeacht de taal waarin de site staat.
- **Offline & installeerbaar**: een manifest en een service worker maken de site installeerbaar; een eerder geopende pagina blijft leesbaar zonder verbinding. Handig aan de balie of met een beperkte databundel.
- **Printbaar als hand-out**: een printstylesheet verbergt de interactieve onderdelen en schrijft de officiële URL voluit, zodat elke regelingpagina als papieren blad meegegeven kan worden.
- **Zichtbare houdbaarheid**: regelingen waarvan `lastReviewed` ouder is dan negen maanden krijgen automatisch een waarschuwingsbadge, vertaald in alle 9 talen.
- **Wekelijkse linkcontrole**: een GitHub Action bevraagt elke `officialUrl` en opent een issue met de onbereikbare links, zodat een verhuisde gemeentepagina niet stilletjes een doodlopende link wordt.
- **Maandelijkse reviewronde**: een tweede Action zet elke maand een handvol regelingen in de wachtrij om opnieuw tegen de bron gelezen te worden, met de `por-verificar` regelingen voorop. Een linkcontrole ziet namelijk niet dat een bedrag is veranderd of dat een regeling stilletjes is afgeschaft.
- **Utrecht Huisstijl & Design**:
  - Primaire kleur: **Utrecht Rood** (`#CC0000`) en Sint Maarten diagonaalmotief.
  - Handgemaakte geometrische SVG-illustraties (Domtoren, omafiets, Oudegracht gracht, boomspiegel).
  - Vloeiende CSS-animaties (fiets in footer, checkmark animatie, stagger entrance).
- **SEO & Toegankelijkheid**: Volledig statisch gegenereerd (SSG) voor 100% SEO indexatie, `sitemap.xml`, OpenGraph tags, `hreflang` cross-references en AA toegankelijkheidscontrast.
- **Geen Backend / Database**: Gehost uitsluitend via **GitHub Pages**.

---

## 🚀 Lokaal Ontwikkelen (Local Development)

Clone de repository en start de lokale preview server:

```bash
git clone https://github.com/utrecht-voor-iedereen/utrecht-voor-jou.git
cd utrecht-voor-jou

# 1. Valideer de JSON dataset en taalbestanden
npm run validate

# 2. Genereer de statische HTML site in /dist
npm run build

# 3. Start de lokale preview server op http://localhost:3000/nl/
npm run dev
```

Controleer daarnaast of alle officiële bronnen nog bereikbaar zijn. Dit doet
netwerkverzoeken naar utrecht.nl en de andere organisaties, dus draai het niet
in een lus:

```bash
npm run check-links
```

En kijk welke regelingen aan de beurt zijn om opnieuw tegen de bron gelezen te
worden:

```bash
npm run review-due
```

> **Let op bij de service worker.** Zodra je de site één keer lokaal hebt geopend,
> registreert de browser de service worker en serveert hij assets uit de cache.
> Zie je je wijziging niet terug, gebruik dan een hard reload of vink
> *Application → Service Workers → Update on reload* aan in de DevTools.

---

## 📦 Project Structuur (Structure)

```text
utrecht-voor-jou/
├── data/
│   └── beneficios.json       # Master dataset met alle regelingen
├── locales/
│   ├── nl.json               # Nederlands (Default)
│   ├── en.json               # English
│   ├── es.json               # Español
│   ├── de.json, tr.json...   # Overige 6 talen
├── schemas/
│   └── beneficios.schema.json # JSON Schema voor validering
├── src/
│   ├── css/styles.css        # Design system, printstylesheet, animatie
│   ├── js/                   # Client-side logica (checker, filters, i18n)
│   ├── sw.js                 # Service worker (build.js schrijft hem naar dist/)
│   └── svg/                  # Handgemaakte SVG-illustraties + app-icon
├── scripts/
│   ├── build.js              # Node.js SSG generator
│   ├── validate.js           # PR & Data valideringsscript
│   ├── check-links.js        # Controleert elke officialUrl
│   ├── review-due.js         # Kiest de volgende regelingen om te herlezen
│   └── dev.js                # Lokale HTTP preview server
└── .github/
    └── workflows/
        ├── deploy.yml        # Build + Deploy naar GitHub Pages
        ├── validate.yml      # PR schema check
        ├── link-check.yml    # Wekelijkse linkcontrole → GitHub issue
        └── review-rotation.yml # Maandelijkse reviewronde → GitHub issue
```

`dist/` staat in `.gitignore`: de gepubliceerde site wordt door `deploy.yml`
gebouwd, niet vanuit een lokale build gecommit. `manifest.webmanifest` en
`sw.js` worden bij elke build gegenereerd; de service worker krijgt het
build-tijdstip als cachenaam mee, zodat een nieuwe deploy de vorige cache
opruimt.

---

## 🤝 Help Mee (How to Contribute via PR)

Lees onze [CONTRIBUTING.md](./CONTRIBUTING.md) om te zien hoe je in 3 eenvoudige stappen een nieuwe regeling kunt toevoegen door `data/beneficios.json` te bewerken en een Pull Request in te dienen.

---

## 📄 Licentie (License)

Gepubliceerd onder de **EUPL-1.2** (European Union Public Licence v1.2).
