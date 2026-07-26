# 🏰 Utrecht Voor Jou

![Build & Deploy](https://github.com/utrecht-beslist/utrecht-voor-jou/actions/workflows/deploy.yml/badge.svg)
![License EUPL-1.2](https://img.shields.io/badge/license-EUPL--1.2-red.svg)
![i18n 9 Languages](https://img.shields.io/badge/i18n-9%20languages-blue.svg)
![GitHub Pages](https://img.shields.io/badge/hosting-GitHub%20Pages-success.svg)

> **Utrecht Voor Jou** is een 100% open-source, meertalig en onafhankelijk burgerinitiatief dat 50+ gratis regelingen, subsidies, vergoedingen en voorzieningen van de Gemeente Utrecht inzichtelijk maakt.

---

## 🌟 Kenmerken / Key Features

- **9 Talen vanaf dag 1 (9 Languages)**: Nederlands (`nl`), Engels (`en`), Spaans (`es`), Duits (`de`), Turks (`tr`), Frans (`fr`), Italiaans (`it`), Portugees (`pt`), Portugees van Brazilië (`pt-BR`).
- **Interactive "Heb ik recht?" Checker**: 4-vragen wizard tool die 100% client-side werkt in de browser. Geen dataverzameling, geen cookies, geen privacyzorgen.
- **50 Initiële Regelingen**: Verdeeld over 8 categorieën (Verde y Naturaleza, Dinero y Ayudas, Energía y Vivienda, Legal y Trámites, Cultura y Ocio, Mobiliteit, Comunidad & Circulair, Vida Cotidiana).
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
git clone https://github.com/utrecht-beslist/utrecht-voor-jou.git
cd utrecht-voor-jou

# 1. Valideer de JSON dataset en taalbestanden
npm run validate

# 2. Genereer de statische HTML site in /dist
npm run build

# 3. Start de lokale preview server op http://localhost:3000/nl/
npm run dev
```

---

## 📦 Project Structuur (Structure)

```text
utrecht-voor-jou/
├── data/
│   └── beneficios.json       # Master dataset met alle 50 regelingen
├── locales/
│   ├── nl.json               # Nederlands (Default)
│   ├── en.json               # English
│   ├── es.json               # Español
│   ├── de.json, tr.json...   # Overige 6 talen
├── schemas/
│   └── beneficios.schema.json # JSON Schema voor validering
├── src/
│   ├── css/styles.css        # Utrecht Design System & Animatie
│   ├── js/                   # Client-side logica (checker, filters, i18n)
│   └── svg/                  # Handgemaakte SVG-illustraties
├── scripts/
│   ├── build.js              # Node.js SSG generator
│   ├── validate.js           # PR & Data valideringsscript
│   └── dev.js                # Lokale HTTP preview server
└── .github/
    └── workflows/
        ├── deploy.yml        # Build + Deploy naar GitHub Pages
        └── validate.yml      # PR schema check
```

---

## 🤝 Help Mee (How to Contribute via PR)

Lees onze [CONTRIBUTING.md](./CONTRIBUTING.md) om te zien hoe je in 3 eenvoudige stappen een nieuwe regeling kunt toevoegen door `data/beneficios.json` te bewerken en een Pull Request in te dienen.

---

## 📄 Licentie (License)

Gepubliceerd onder de **EUPL-1.2** (European Union Public Licence v1.2).
