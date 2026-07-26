/**
 * Utrecht Voor Jou — Static Site Generator Build Pipeline
 * Reads data/beneficios.json and locales/*.json to generate fully pre-rendered static HTML
 * for all 9 languages, 50 benefit detail pages, about pages, sitemap.xml, and RSS feeds.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'beneficios.json');
const LOCALES_DIR = path.join(ROOT_DIR, 'locales');

const LANGUAGES = [
  { code: 'nl', name: 'Nederlands', flag: 'NL' },
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'es', name: 'Español', flag: 'ES' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'tr', name: 'Türkçe', flag: 'TR' },
  { code: 'fr', name: 'Français', flag: 'FR' },
  { code: 'it', name: 'Italiano', flag: 'IT' },
  { code: 'pt', name: 'Português', flag: 'PT' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: 'PT-BR' }
];

// Helper to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Load dataset and localization dictionaries
function loadData() {
  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  const catalog = JSON.parse(rawData);

  const locales = {};
  LANGUAGES.forEach(lang => {
    const locFile = path.join(LOCALES_DIR, `${lang.code}.json`);
    if (fs.existsSync(locFile)) {
      locales[lang.code] = JSON.parse(fs.readFileSync(locFile, 'utf8'));
    } else {
      locales[lang.code] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'nl.json'), 'utf8'));
    }
  });

  return { catalog, locales };
}

// Generate hreflang meta tags HTML string
function renderHreflangTags(currentPath) {
  return LANGUAGES.map(l => {
    const localizedPath = `/${l.code}${currentPath}`;
    return `<link rel="alternate" hreflang="${l.code}" href="${localizedPath}" />`;
  }).join('\n    ');
}

// Language selector HTML options
function renderLangSelectOptions(currentCode) {
  return LANGUAGES.map(l => {
    const selected = l.code === currentCode ? 'selected' : '';
    return `<option value="${l.code}" ${selected}>${l.flag} - ${l.name}</option>`;
  }).join('\n');
}

// Main HTML Shell Component
function renderHtmlShell({ title, description, content, langCode, currentSubpath, catalogData, dict }) {
  const hreflangs = renderHreflangTags(currentSubpath);
  const langOptions = renderLangSelectOptions(langCode);

  return `<!DOCTYPE html>
<html lang="${langCode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.5">
  <title>${title} | ${dict.site_title}</title>
  <meta name="description" content="${description}">
  
  <!-- SEO & OpenGraph -->
  <meta property="og:title" content="${title} | ${dict.site_title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${langCode}">
  
  ${hreflangs}

  <link rel="stylesheet" href="/css/styles.css">
  <link rel="alternate" type="application/rss+xml" title="Utrecht Voor Jou RSS (${langCode})" href="/rss/${langCode}.xml" />

  <script>
    window.BENEFICIOS_DATA = ${JSON.stringify(catalogData)};
  </script>
</head>
<body>
  <a href="#main-content" class="skip-link">Ga direct naar de inhoud</a>

  <!-- SITE HEADER -->
  <header class="site-header" role="banner">
    <div class="header-container">
      <a href="/${langCode}/" class="brand-logo" aria-label="${dict.site_title} Home">
        <svg width="36" height="36" viewBox="0 0 100 100">
          <rect x="5" y="5" width="90" height="90" rx="16" fill="#FFFFFF"/>
          <polygon points="5,5 95,5 5,95" fill="#CC0000"/>
          <text x="50" y="70" font-family="sans-serif" font-size="60" font-weight="900" fill="#FFFFFF" text-anchor="middle">U</text>
        </svg>
        <span class="brand-title">
          Utrecht Voor Jou
          <span class="brand-subtitle">${dict.hero_badge}</span>
        </span>
      </a>

      <nav class="site-nav" aria-label="Main Navigation">
        <ul class="nav-menu">
          <li><a href="/${langCode}/" class="nav-link">${dict.nav_home}</a></li>
          <li><a href="/${langCode}/#checker" class="nav-link highlight">${dict.nav_checker}</a></li>
          <li><a href="/${langCode}/over/" class="nav-link">${dict.nav_about}</a></li>
          <li>
            <div class="lang-selector-wrapper">
              <select id="lang-select" class="lang-select" aria-label="Taal selecteren / Select Language">
                ${langOptions}
              </select>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  </header>

  <!-- MAIN CONTENT -->
  <main id="main-content" role="main">
    ${content}
  </main>

  <!-- SITE FOOTER -->
  <footer class="site-footer" role="contentinfo">
    <div class="footer-bike-track">
      <svg class="riding-bike-svg" width="60" height="38" viewBox="0 0 160 100">
        <circle cx="35" cy="65" r="22" stroke="#FFCC00" stroke-width="5" fill="none" />
        <circle cx="125" cy="65" r="22" stroke="#FFCC00" stroke-width="5" fill="none" />
        <path d="M 35 65 L 70 65 L 105 35 L 125 65" fill="none" stroke="#FFFFFF" stroke-width="5" />
        <path d="M 35 65 L 75 35 L 115 35" fill="none" stroke="#FFFFFF" stroke-width="5" />
        <line x1="70" y1="65" x2="65" y2="28" stroke="#FFFFFF" stroke-width="5" />
        <path d="M 55 28 H 75" stroke="#FFCC00" stroke-width="6" />
      </svg>
    </div>

    <div class="footer-content">
      <div>
        <h3 style="color: var(--color-yellow-accent); margin-bottom: 0.8rem;">Utrecht Voor Jou</h3>
        <div class="footer-disclaimer-box">
          <p>⚠️ ${dict.footer_disclaimer}</p>
        </div>
      </div>
      <div>
        <h4 style="color: var(--color-white); margin-bottom: 0.8rem;">Links</h4>
        <ul class="footer-links-list">
          <li><a href="/${langCode}/over/">${dict.nav_about}</a></li>
          <li><a href="https://github.com/zaswear/utrecht-voor-jou" target="_blank" rel="noopener">${dict.nav_contribute}</a></li>
          <li><a href="/rss/${langCode}.xml">RSS Feed (${langCode.toUpperCase()})</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom-bar">
      <p>&copy; 2026 Utrecht Voor Jou Community. ${dict.footer_rights}</p>
    </div>
  </footer>

  <script src="/js/i18n-selector.js"></script>
  <script src="/js/catalog.js"></script>
  <script src="/js/checker.js"></script>
</body>
</html>`;
}

// Render Catalog Homepage HTML
function renderCatalogHome(catalog, dict, langCode) {
  const cardsHtml = catalog.map(item => {
    const title = item.title[langCode] || item.title['nl'] || item.title['en'];
    const desc = item.shortDescription[langCode] || item.shortDescription['nl'] || item.shortDescription['en'];
    const detailUrl = `/${langCode}/beneficio/${item.id}/`;

    return `<article class="benefit-card" data-id="${item.id}" data-category="${item.category}" data-type="${item.type}">
      <div class="card-header-bar">
        <span class="category-chip" data-cat="${item.category}">${dict['cat_' + item.category] || item.category}</span>
        <span class="type-tag">${dict['type_' + item.type] || item.type}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="${detailUrl}">${title}</a></h3>
        <p class="card-description">${desc}</p>
        ${item.expiresSoon ? `<div class="expiry-alert-banner">⏰ ${dict.expires_soon_badge} (${item.expiryDate || '30-06-2026'})</div>` : ''}
        <div class="card-footer-meta">
          <span class="verification-status">
            <span class="status-dot ${item.verificationStatus}"></span>
            ${item.verificationStatus === 'verificado' ? dict.verified_badge + ' ' + item.lastReviewed : dict.unverified_badge}
          </span>
          <a href="${detailUrl}" class="btn-detail">Info & Aanvragen</a>
        </div>
      </div>
    </article>`;
  }).join('\n');

  return `
    <!-- HERO SECTION -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <span class="hero-badge">Gemeente Utrecht</span>
          <h1>Utrecht <span class="accent">Voor Jou</span></h1>
          <p class="hero-subtitle">${dict.tagline}</p>
        </div>
        <div class="hero-illustration">
          <svg width="100" height="150" viewBox="0 0 120 200">
            <rect x="40" y="100" width="40" height="90" fill="#FFFFFF"/>
            <polygon points="40,140 80,100 80,120 40,160" fill="#FFCC00"/>
            <rect x="44" y="60" width="32" height="40" fill="#1C4181"/>
            <polygon points="50,25 70,25 74,60 46,60" fill="#FFFFFF"/>
            <polygon points="60,5 65,25 55,25" fill="#FFCC00"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- SEARCH & CONTROLS -->
    <section class="catalog-controls">
      <div class="search-box-container">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="search-input" class="search-input" placeholder="${dict.search_placeholder}" aria-label="Zoek in catalogus">
      </div>

      <div class="filter-grid">
        <div class="filter-group">
          <label class="filter-label" for="filter-category">${dict.filter_category}</label>
          <select id="filter-category" class="filter-select">
            <option value="all">${dict.all_categories}</option>
            <option value="verde">${dict.cat_verde}</option>
            <option value="dinero">${dict.cat_dinero}</option>
            <option value="energia">${dict.cat_energia}</option>
            <option value="legal">${dict.cat_legal}</option>
            <option value="cultura">${dict.cat_cultura}</option>
            <option value="movilidad">${dict.cat_movilidad}</option>
            <option value="comunidad">${dict.cat_comunidad}</option>
            <option value="vida">${dict.cat_vida}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="filter-type">${dict.filter_type}</label>
          <select id="filter-type" class="filter-select">
            <option value="all">${dict.all_types}</option>
            <option value="gratis">${dict.type_gratis}</option>
            <option value="subsidio">${dict.type_subsidio}</option>
            <option value="préstamo">${dict.type_prestamo}</option>
            <option value="servicio">${dict.type_servicio}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="filter-wijk">${dict.filter_wijk}</label>
          <select id="filter-wijk" class="filter-select">
            <option value="all">${dict.all_wijken}</option>
            <option value="Binnenstad">Binnenstad</option>
            <option value="Oost">Oost</option>
            <option value="West">West</option>
            <option value="Noordwest">Noordwest</option>
            <option value="Overvecht">Overvecht</option>
            <option value="Zuid">Zuid</option>
            <option value="Zuidwest">Zuidwest</option>
            <option value="Leidsche Rijn">Leidsche Rijn</option>
            <option value="Vleuten-De Meern">Vleuten-De Meern</option>
            <option value="Noordoost">Noordoost</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="filter-profile">${dict.filter_profile}</label>
          <select id="filter-profile" class="filter-select">
            <option value="all">${dict.all_profiles}</option>
            <option value="gezin">Gezin / Kinderen</option>
            <option value="student">Student / Jongere</option>
            <option value="senior">Senior (65+)</option>
            <option value="ondernemer">Ondernemer / ZZP</option>
            <option value="lage-inkomens">Lage inkomens / U-pas</option>
            <option value="huurder">Huurder</option>
            <option value="huiseienaar">Huiseigenaar</option>
          </select>
        </div>
      </div>
    </section>

    <!-- WIST JE DAT ROTATOR -->
    <div class="wist-je-dat-container">
      <div class="wist-je-dat-card">
        <div>
          <div class="wist-je-dat-header">
            <span style="font-size: 1.5rem;">💡</span>
            <span class="wist-je-dat-title">${dict.wist_je_dat_title}</span>
          </div>
          <p id="wist-je-dat-text" class="wist-je-dat-text">Laden van advies...</p>
        </div>
        <div>
          <button id="wist-je-dat-next-btn" class="wist-je-dat-btn">${dict.wist_je_dat_btn}</button>
        </div>
      </div>
    </div>

    <!-- CATALOG GRID -->
    <section class="catalog-section">
      <div class="catalog-stats-bar">
        <div class="benefit-count-giant"><span id="visible-count">${catalog.length}</span> Regelingen beschikbaar</div>
      </div>

      <div id="cards-grid" class="cards-grid">
        ${cardsHtml}
      </div>
    </section>

    <!-- INTERACTIVE CHECKER WIZARD -->
    <section id="checker" class="checker-section">
      <div class="checker-container">
        <div class="checker-header">
          <h2>${dict.checker_title}</h2>
          <p>${dict.checker_subtitle}</p>
        </div>

        <form id="checker-form">
          <div class="checker-grid">
            <div class="checker-field">
              <label for="checker-age">${dict.checker_q_age}</label>
              <select id="checker-age">
                <option value="all">Alle leeftijden</option>
                <option value="youth">&lt; 18 jaar</option>
                <option value="adult">18 - 65 jaar</option>
                <option value="senior">65+ jaar</option>
              </select>
            </div>

            <div class="checker-field">
              <label for="checker-income">${dict.checker_q_income}</label>
              <select id="checker-income">
                <option value="all">Geen specifieke inkomenseis</option>
                <option value="low">Laag inkomen / Bijstand / U-pas</option>
                <option value="modest">Modestaal / Middeninkomen</option>
              </select>
            </div>

            <div class="checker-field">
              <label for="checker-wijk">${dict.checker_q_wijk}</label>
              <select id="checker-wijk">
                <option value="all">${dict.all_wijken}</option>
                <option value="Binnenstad">Binnenstad</option>
                <option value="Oost">Oost</option>
                <option value="West">West</option>
                <option value="Noordwest">Noordwest</option>
                <option value="Overvecht">Overvecht</option>
                <option value="Zuid">Zuid</option>
                <option value="Zuidwest">Zuidwest</option>
                <option value="Leidsche Rijn">Leidsche Rijn</option>
                <option value="Vleuten-De Meern">Vleuten-De Meern</option>
                <option value="Noordoost">Noordoost</option>
              </select>
            </div>

            <div class="checker-field">
              <label for="checker-profile">${dict.checker_q_profile}</label>
              <select id="checker-profile">
                <option value="all">${dict.all_profiles}</option>
                <option value="gezin">Gezin / Ouder met kinderen</option>
                <option value="student">Student / Jongere</option>
                <option value="senior">Senior</option>
                <option value="ondernemer">Ondernemer / ZZP</option>
                <option value="huurder">Huurder</option>
                <option value="huiseienaar">Huiseigenaar</option>
              </select>
            </div>
          </div>

          <button type="submit" class="checker-submit-btn">${dict.checker_btn_submit}</button>
        </form>

        <div id="checker-results" class="checker-results-box">
          <div class="results-header-icon">
            <svg class="checkmark-svg" viewBox="0 0 52 52">
              <circle class="checkmark-circle" cx="26" cy="26" r="25"/>
              <path class="checkmark-check" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h3 style="font-size: 1.5rem;">${dict.checker_results_title} (<span id="checker-results-count">0</span>)</h3>
          </div>
          <div id="checker-results-grid" class="cards-grid"></div>
        </div>
      </div>
    </section>
  `;
}

// Render Benefit Detail Page HTML
function renderBenefitDetail(item, dict, langCode) {
  const title = item.title[langCode] || item.title['nl'] || item.title['en'];
  const desc = item.shortDescription[langCode] || item.shortDescription['nl'] || item.shortDescription['en'];
  
  const rawEligibility = item.eligibility[langCode] || item.eligibility['nl'] || item.eligibility['en'] || [];
  const eligibilityList = Array.isArray(rawEligibility) ? rawEligibility : [rawEligibility];
  
  const rawSteps = item.howToApply[langCode] || item.howToApply['nl'] || item.howToApply['en'] || [];
  const stepsList = Array.isArray(rawSteps) ? rawSteps : [rawSteps];

  return `
    <div class="detail-container">
      <a href="/${langCode}/" class="back-link">← ${dict.nav_home}</a>

      <article class="detail-card-main">
        <div class="detail-header-tags">
          <span class="category-chip" data-cat="${item.category}">${dict['cat_' + item.category] || item.category}</span>
          <span class="type-tag">${dict['type_' + item.type] || item.type}</span>
          <span class="verification-status">
            <span class="status-dot ${item.verificationStatus}"></span>
            ${item.verificationStatus === 'verificado' ? dict.verified_badge + ' ' + item.lastReviewed : dict.unverified_badge}
          </span>
        </div>

        <h1 class="detail-title">${title}</h1>
        <p class="card-description" style="font-size: 1.2rem; margin-bottom: 2rem;">${desc}</p>

        ${item.expiresSoon ? `<div class="expiry-alert-banner" style="margin-bottom: 2rem;">⚠️ <strong>${dict.expires_soon_badge}:</strong> ${item.expiryDate || '30-06-2026'}</div>` : ''}

        <div class="detail-section-block">
          <h3>${dict.eligibility_title}</h3>
          <ul style="padding-left: 1.5rem; line-height: 1.8;">
            ${eligibilityList.map(rule => `<li>${rule}</li>`).join('')}
          </ul>
        </div>

        <div class="detail-section-block">
          <h3>${dict.steps_to_apply}</h3>
          <ol class="steps-list">
            ${stepsList.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>

        <div style="margin-top: 3rem; text-align: center;">
          <a href="${item.officialUrl}" target="_blank" rel="noopener noreferrer" class="official-btn-large">
            ${dict.official_link_btn} ↗
          </a>
        </div>
      </article>
    </div>
  `;
}

// Render About Page (/over/) HTML
function renderAboutPage(dict, langCode) {
  return `
    <div class="over-container">
      <a href="/${langCode}/" class="back-link">← ${dict.nav_home}</a>

      <article class="detail-card-main">
        <h1 class="detail-title">Over "Utrecht Voor Jou"</h1>
        
        <div class="detail-section-block">
          <h3>Missie & Burgerinitiatief</h3>
          <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1rem;">
            Veel inwoners van Utrecht laten jaarlijks duizenden euro's aan subsidies, vergoedingen en gratis gemeentelijke diensten liggen simpelweg omdat ze het bestaan ervan niet kennen. "Utrecht Voor Jou" is een 100% onafhankelijk, transparant en open-source burgerinitiatief dat al deze regelingen inzichtelijk maakt.
          </p>
        </div>

        <div class="detail-section-block">
          <h3>Methodologie & Verificatie</h3>
          <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1rem;">
            Elk voordeel in deze catalogus bevat een link naar de officiële gemeentelijke bron (Utrecht.nl, U-pas.nl, etc.) en een statusstempel. Alle data wordt periodiek gecontroleerd door vrijwilligers uit de gemeenschap.
          </p>
        </div>

        <div class="detail-section-block">
          <h3>Juridische Disclaimer</h3>
          <div class="footer-disclaimer-box" style="background-color: #FFF3CD; color: #856404; border-left-color: #CC0000; margin-top: 0.5rem;">
            <p><strong>Let op:</strong> Deze website geeft geen juridisch advies. Raadpleeg voor definitieve aanvragen en voorwaarden altijd de officiële website van de Gemeente Utrecht.</p>
          </div>
        </div>

        <div class="detail-section-block">
          <h3>Hoe bijdragen (PR via GitHub)?</h3>
          <p style="font-size: 1.05rem; line-height: 1.7;">
            Ontbreekt er een regeling of klopt een link niet meer? Iedereen kan een wijziging voorstellen via een Pull Request op GitHub. Bewerk eenvoudig <code>data/beneficios.json</code> of dien een issue in via onze sjablonen.
          </p>
          <div style="margin-top: 1.5rem;">
            <a href="https://github.com/zaswear/utrecht-voor-jou" target="_blank" rel="noopener" class="official-btn-large">
              Bekijk op GitHub (PR indienen) ↗
            </a>
          </div>
        </div>
      </article>
    </div>
  `;
}

// Generate RSS Feed per language
function generateRssFeed(catalog, dict, langCode) {
  const itemsXml = catalog.map(item => {
    const title = item.title[langCode] || item.title['nl'] || item.title['en'];
    const desc = item.shortDescription[langCode] || item.shortDescription['nl'] || item.shortDescription['en'];
    const link = `https://zaswear.github.io/utrecht-voor-jou/${langCode}/beneficio/${item.id}/`;

    return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${link}</link>
      <guid>${link}</guid>
      <description><![CDATA[${desc}]]></description>
      <pubDate>${new Date(item.lastReviewed).toUTCString()}</pubDate>
    </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Utrecht Voor Jou (${langCode.toUpperCase()})</title>
    <link>https://zaswear.github.io/utrecht-voor-jou/${langCode}/</link>
    <description>${dict.tagline}</description>
    <language>${langCode}</language>
    ${itemsXml}
  </channel>
</rss>`;
}

// Generate XML Sitemap
function generateSitemap(catalog) {
  let urls = [];

  LANGUAGES.forEach(lang => {
    urls.push(`https://zaswear.github.io/utrecht-voor-jou/${lang.code}/`);
    urls.push(`https://zaswear.github.io/utrecht-voor-jou/${lang.code}/over/`);

    catalog.forEach(item => {
      urls.push(`https://zaswear.github.io/utrecht-voor-jou/${lang.code}/beneficio/${item.id}/`);
    });
  });

  const urlElements = urls.map(u => `<url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

// Execute static site generation
function build() {
  console.log('🚀 Starting Utrecht Voor Jou SSG build...');
  ensureDir(DIST_DIR);

  const { catalog, locales } = loadData();

  // Create RSS output dir
  ensureDir(path.join(DIST_DIR, 'rss'));

  // Copy assets
  ['css', 'js', 'svg'].forEach(assetDir => {
    const srcPath = path.join(ROOT_DIR, 'src', assetDir);
    const destPath = path.join(DIST_DIR, assetDir);
    ensureDir(destPath);
    if (fs.existsSync(srcPath)) {
      fs.readdirSync(srcPath).forEach(file => {
        fs.copyFileSync(path.join(srcPath, file), path.join(destPath, file));
      });
    }
  });

  // Build Pages for all 9 languages
  LANGUAGES.forEach(lang => {
    const code = lang.code;
    const dict = locales[code];
    const langDir = path.join(DIST_DIR, code);
    ensureDir(langDir);

    // 1. Catalog Home Page /<lang>/index.html
    const homeContent = renderCatalogHome(catalog, dict, code);
    const homeHtml = renderHtmlShell({
      title: dict.nav_home,
      description: dict.tagline,
      content: homeContent,
      langCode: code,
      currentSubpath: '/',
      catalogData: catalog,
      dict: dict
    });
    fs.writeFileSync(path.join(langDir, 'index.html'), homeHtml);

    // 2. About Page /<lang>/over/index.html
    const overDir = path.join(langDir, 'over');
    ensureDir(overDir);
    const overContent = renderAboutPage(dict, code);
    const overHtml = renderHtmlShell({
      title: dict.nav_about,
      description: 'Over het onafhankelijke burgerinitiatief Utrecht Voor Jou',
      content: overContent,
      langCode: code,
      currentSubpath: '/over/',
      catalogData: catalog,
      dict: dict
    });
    fs.writeFileSync(path.join(overDir, 'index.html'), overHtml);

    // 3. Benefit Detail Pages /<lang>/beneficio/<id>/index.html
    catalog.forEach(item => {
      const detailDir = path.join(langDir, 'beneficio', `${item.id}`);
      ensureDir(detailDir);

      const titleText = item.title[code] || item.title['nl'] || item.title['en'];
      const descText = item.shortDescription[code] || item.shortDescription['nl'] || item.shortDescription['en'];
      const detailContent = renderBenefitDetail(item, dict, code);

      const detailHtml = renderHtmlShell({
        title: titleText,
        description: descText,
        content: detailContent,
        langCode: code,
        currentSubpath: `/beneficio/${item.id}/`,
        catalogData: catalog,
        dict: dict
      });
      fs.writeFileSync(path.join(detailDir, 'index.html'), detailHtml);
    });

    // 4. RSS Feed per language /rss/<lang>.xml
    const rssXml = generateRssFeed(catalog, dict, code);
    fs.writeFileSync(path.join(DIST_DIR, 'rss', `${code}.xml`), rssXml);
  });

  // 5. Root Redirect index.html
  const rootRedirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=/nl/">
  <script>
    var preferred = localStorage.getItem('utrecht_lang');
    if (preferred && ['nl','en','es','de','tr','fr','it','pt','pt-BR'].includes(preferred)) {
      window.location.href = '/' + preferred + '/';
    } else {
      window.location.href = '/nl/';
    }
  </script>
</head>
<body>
  <p>Redirecting to <a href="/nl/">Utrecht Voor Jou</a>...</p>
</body>
</html>`;
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), rootRedirectHtml);

  // 6. XML Sitemap
  const sitemapXml = generateSitemap(catalog);
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml);

  console.log('✅ SSG Build complete! Generated static site in dist/');
}

build();
