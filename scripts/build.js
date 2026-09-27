/**
 * Utrecht Voor Jou — Static Site Generator Build Pipeline
 * Reads data/beneficios.json and locales/*.json to generate fully pre-rendered static HTML
 * for all 9 languages, 50 benefit detail pages, about pages, sitemap.xml, and RSS feeds.
 * Uses relative paths so GitHub Pages project sites (/utrecht-voor-jou/) work 100% seamlessly.
 */

const fs = require('fs');
const path = require('path');
const qr = require('./lib/qr');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'beneficios.json');
const LOCALES_DIR = path.join(ROOT_DIR, 'locales');
const CONFIG_FILE = path.join(ROOT_DIR, 'site.config.json');

const SITE_URL = 'https://utrecht-voor-iedereen.github.io/utrecht-voor-jou';
const REPO_URL = 'https://github.com/utrecht-voor-iedereen/utrecht-voor-jou';

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

// Stamped into the service worker so each deploy invalidates the previous cache.
const BUILD_ID = new Date().toISOString().replace(/[:.]/g, '-');

// An entry whose lastReviewed is older than this is flagged in the UI. Municipal
// schemes are typically revised per budget year, so a little under a year keeps
// the warning meaningful instead of constant.
const STALE_AFTER_MONTHS = 9;
const BUILD_DATE = new Date();

// Aggregate page counts, so we can tell whether anyone actually reaches the
// benefit pages. Reads site.config.json, overridable with GOATCOUNTER_CODE for
// forks that want their own counter. An empty code emits no script at all, so a
// fork or a local build stays free of third-party requests.
function loadAnalyticsCode() {
  const fromEnv = (process.env.GOATCOUNTER_CODE || '').trim();
  if (fromEnv) return fromEnv;
  if (!fs.existsSync(CONFIG_FILE)) return '';
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const analytics = config.analytics || {};
  if (analytics.provider !== 'goatcounter') return '';
  return (analytics.code || '').trim();
}

const ANALYTICS_CODE = loadAnalyticsCode();

// No cookies and no identifiers, and the request is only made after Do Not
// Track and Global Privacy Control have been checked. count.js skips localhost
// and private ranges on its own, so a local build never pollutes the numbers.
function renderAnalytics() {
  if (!ANALYTICS_CODE) return '';
  return `
  <script>
    (function () {
      if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl) return;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://gc.zgo.at/count.js';
      s.setAttribute('data-goatcounter', 'https://${ANALYTICS_CODE}.goatcounter.com/count');
      document.head.appendChild(s);
    })();
  </script>`;
}

// The taglines come from locales/*.json, which we control, but they land in an
// HTML attribute and in element text on the root page. Escaping is cheap and
// stops a stray quote or ampersand from breaking the only page that has no
// framework behind it.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// A reader at the counter is the first to notice that an amount changed, and
// asking them to open a pull request loses them. This prefills the correction
// issue form instead: which entry, and the page they were reading, in their own
// language. Ampersands are escaped because the URL lands in an HTML attribute.
function renderFeedbackUrl(item, langCode) {
  const titleNl = item.title.nl;
  const params = [
    ['template', 'correccion.yml'],
    ['title', `[Correctie]: #${item.id} ${titleNl}`],
    ['item_id', `ID #${item.id} — ${titleNl}`],
    ['page_url', `${SITE_URL}/${langCode}/beneficio/${item.id}/`]
  ];
  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&amp;');
  return `${REPO_URL}/issues/new?${query}`;
}

// "tot € 5.000 eenmalig" or "€ 125 - € 800 per jaar". The amount lives in the
// data as numbers so the catalog can sort on it; this is the only place that
// turns it into words, and it uses the reader's own number formatting.
function formatAmount(amount, dict, langCode) {
  if (!amount) return '';
  const money = value =>
    new Intl.NumberFormat(langCode, {
      style: 'currency',
      currency: amount.currency,
      maximumFractionDigits: 0
    }).format(value);

  const period = dict[`amount_period_${amount.period}`] || '';
  const range = typeof amount.min === 'number' && amount.min !== amount.max
    ? `${money(amount.min)} – ${money(amount.max)}`
    : `${dict.amount_upto} ${money(amount.max)}`;

  return `${range} ${period}`.trim();
}

// The type 'préstamo' carries an accent that its locale key does not, so a
// naive dict['type_' + item.type] lookup misses and the card falls back to
// printing the raw Spanish value on every language version.
function typeLabel(item, dict) {
  const key = 'type_' + item.type.replace('é', 'e');
  return dict[key] || item.type;
}

function isStale(lastReviewed) {
  if (!lastReviewed) return false;
  const reviewed = new Date(lastReviewed);
  if (Number.isNaN(reviewed.getTime())) return false;
  const cutoff = new Date(BUILD_DATE);
  cutoff.setMonth(cutoff.getMonth() - STALE_AFTER_MONTHS);
  return reviewed < cutoff;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

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

function renderHreflangTags(basePath, currentSubpath) {
  return LANGUAGES.map(l => {
    return `<link rel="alternate" hreflang="${l.code}" href="${basePath}${l.code}${currentSubpath}" />`;
  }).join('\n    ');
}

function renderLangSelectOptions(currentCode) {
  return LANGUAGES.map(l => {
    const selected = l.code === currentCode ? 'selected' : '';
    return `<option value="${l.code}" ${selected}>${l.flag} - ${l.name}</option>`;
  }).join('\n');
}

// Main HTML Shell Component using dynamic basePath
function renderHtmlShell({ title, description, content, langCode, currentSubpath, catalogData, dict, basePath, noIndex = false }) {
  const hreflangs = renderHreflangTags(basePath, currentSubpath);
  const langOptions = renderLangSelectOptions(langCode);

  return `<!DOCTYPE html>
<html lang="${langCode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | ${dict.site_title}</title>
  <meta name="description" content="${description}">
  ${noIndex ? '<meta name="robots" content="noindex, follow">' : ''}

  <!-- SEO & OpenGraph -->
  <meta property="og:title" content="${title} | ${dict.site_title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/img/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta property="og:locale" content="${langCode}">
  
  ${hreflangs}

  <link rel="stylesheet" href="${basePath}css/styles.css">
  <link rel="alternate" type="application/rss+xml" title="Utrecht Voor Jou RSS (${langCode})" href="${basePath}rss/${langCode}.xml" />

  <!-- Installable / offline -->
  <link rel="manifest" href="${basePath}manifest.webmanifest">
  <link rel="icon" type="image/svg+xml" href="${basePath}svg/app-icon.svg">
  <link rel="apple-touch-icon" href="${basePath}svg/app-icon.svg">
  <meta name="theme-color" content="#CC0000">

  <script>
    window.BENEFICIOS_DATA = ${JSON.stringify(catalogData)};
    window.BASE_PATH = "${basePath}";
    // The checker builds cards in the browser; without the dictionary it would
    // have to fall back to Dutch labels on all nine language versions.
    window.I18N = ${JSON.stringify(dict)};
  </script>
</head>
<body>
  <a href="#main-content" class="skip-link">Ga direct naar de inhoud</a>

  <!-- SITE HEADER -->
  <header class="site-header" role="banner">
    <div class="header-container">
      <a href="${basePath}${langCode}/" class="brand-logo" aria-label="${dict.site_title} Home">
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
          <li><a href="${basePath}${langCode}/" class="nav-link">${dict.nav_home}</a></li>
          <li><a href="${basePath}${langCode}/#checker" class="nav-link highlight">${dict.nav_checker}</a></li>
          <li><a href="${basePath}${langCode}/over/" class="nav-link">${dict.nav_about}</a></li>
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
          <li><a href="${basePath}${langCode}/over/">${dict.nav_about}</a></li>
          <li><a href="https://github.com/utrecht-voor-iedereen/utrecht-voor-jou" target="_blank" rel="noopener">${dict.nav_contribute}</a></li>
          <li><a href="${basePath}rss/${langCode}.xml">RSS Feed (${langCode.toUpperCase()})</a></li>
        </ul>
      </div>
    </div>

      <div class="footer-kofi-section">
        <a href="https://ko-fi.com/zaswear" target="_blank" rel="noopener noreferrer" class="kofi-btn" aria-label="${dict.footer_kofi}">
          <svg class="kofi-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg>
          ${dict.footer_kofi}
        </a>
      </div>

    <div class="footer-bottom-bar">
      <p>&copy; 2026 Utrecht Voor Jou Community. ${dict.footer_rights}</p>
      <p class="footer-signature">Hecho con amor ❤️ por Zaswear</p>
    </div>
  </footer>

  <script src="${basePath}js/i18n-selector.js"></script>
  <script src="${basePath}js/catalog.js"></script>
  <script src="${basePath}js/checker.js"></script>

  <script>
    // The worker lives at the site root so its scope covers every language and
    // detail page, which sit one to three levels deeper.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker
          .register("${basePath}sw.js", { scope: "${basePath}" })
          .catch(function (err) { console.warn('Service worker registration failed:', err); });
      });
    }
  </script>
${renderAnalytics()}
</body>
</html>`;
}

// Order the printed sheets follow. Mirrors the filter order on the catalog so a
// volunteer handing out paper and someone browsing see the same structure.
const CATEGORIES = ['verde', 'dinero', 'energia', 'legal', 'cultura', 'movilidad', 'comunidad', 'vida'];

function renderPrintIndex(catalog, dict, langCode, basePath) {
  const rows = CATEGORIES.map(category => {
    const count = catalog.filter(item => item.category === category).length;
    if (!count) return '';
    return `
      <li class="print-index-item">
        <a href="${basePath}${langCode}/print/${category}/">${dict['cat_' + category] || category}</a>
        <span class="print-index-count">${count}</span>
      </li>`;
  }).join('');

  return `
    <div class="over-container">
      <a href="${basePath}${langCode}/" class="back-link">← ${dict.nav_home}</a>

      <article class="detail-card-main">
        <h1 class="detail-title">${dict.print_index_title}</h1>
        <p class="card-description" style="font-size: 1.1rem; margin-bottom: 2rem;">${dict.print_index_intro}</p>

        <ul class="print-index-list">
          ${rows}
        </ul>
      </article>
    </div>
  `;
}

function renderPrintSheet(catalog, category, dict, langCode, basePath) {
  const items = catalog.filter(item => item.category === category);
  const categoryName = dict['cat_' + category] || category;

  const rowsHtml = items.map(item => {
    const title = item.title[langCode] || item.title['nl'] || item.title['en'];
    const desc = item.shortDescription[langCode] || item.shortDescription['nl'] || item.shortDescription['en'];
    const detailUrl = `${SITE_URL}/${langCode}/beneficio/${item.id}/`;
    return `
      <li class="print-entry">
        <div class="print-entry-qr">${qr.toSvg(detailUrl, { size: 78, label: title })}</div>
        <div class="print-entry-body">
          <h3 class="print-entry-title">${title}</h3>
          <p class="print-entry-desc">${desc}</p>
          <p class="print-entry-url">${typeLabel(item, dict)} · ${item.officialUrl}</p>
        </div>
      </li>`;
  }).join('');

  const sheetDate = BUILD_DATE.toISOString().slice(0, 10);

  return `
    <div class="print-sheet">
      <div class="print-toolbar">
        <a href="${basePath}${langCode}/print/" class="back-link">← ${dict.print_index_title}</a>
        <button type="button" class="print-trigger" onclick="window.print()">${dict.print_button}</button>
      </div>

      <header class="print-header">
        <div>
          <p class="print-kicker">Utrecht Voor Jou · ${dict.hero_badge}</p>
          <h1 class="print-title">${categoryName}</h1>
          <p class="print-subtitle">${dict.print_sheet_intro}</p>
        </div>
        <div class="print-header-qr">
          ${qr.toSvg(`${SITE_URL}/${langCode}/`, { size: 92, label: dict.site_title })}
          <span>${SITE_URL.replace('https://', '')}/${langCode}/</span>
        </div>
      </header>

      <ol class="print-entries">
        ${rowsHtml}
      </ol>

      <footer class="print-footer">
        <p>${dict.footer_disclaimer}</p>
        <p>${dict.print_generated} ${sheetDate}</p>
      </footer>
    </div>
  `;
}

function renderCatalogHome(catalog, dict, langCode, basePath) {
  const cardsHtml = catalog.map(item => {
    const title = item.title[langCode] || item.title['nl'] || item.title['en'];
    const desc = item.shortDescription[langCode] || item.shortDescription['nl'] || item.shortDescription['en'];
    const detailUrl = `${basePath}${langCode}/beneficio/${item.id}/`;

    return `<article class="benefit-card" data-id="${item.id}" data-category="${item.category}" data-type="${item.type}" data-amount-max="${item.amount ? item.amount.max : ''}">
      <div class="card-header-bar">
        <span class="category-chip" data-cat="${item.category}">${dict['cat_' + item.category] || item.category}</span>
        <span class="type-tag">${typeLabel(item, dict)}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="${detailUrl}">${title}</a></h3>
        ${item.amount ? `<p class="amount-chip">${formatAmount(item.amount, dict, langCode)}</p>` : ''}
        <p class="card-description">${desc}</p>
        ${item.expiresSoon ? `<div class="expiry-alert-banner">⏰ ${dict.expires_soon_badge} (${item.expiryDate || '30-06-2026'})</div>` : ''}
        ${isStale(item.lastReviewed) ? `<div class="stale-badge">🕗 ${dict.stale_badge}</div>` : ''}
        <div class="card-footer-meta">
          <span class="verification-status">
            <span class="status-dot ${item.verificationStatus}"></span>
            ${item.verificationStatus === 'verificado' ? dict.verified_badge + ' ' + item.lastReviewed : dict.unverified_badge}
          </span>
          <a href="${detailUrl}" class="btn-detail">${dict.card_detail_btn}</a>
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
          <label class="filter-label" for="sort-select">${dict.sort_label}</label>
          <select id="sort-select" class="filter-select">
            <option value="default">${dict.sort_default}</option>
            <option value="amount">${dict.sort_amount}</option>
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

      <p class="print-cta">
        🖨 <a href="${basePath}${langCode}/print/">${dict.print_nav}</a>
      </p>
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

function renderBenefitDetail(item, dict, langCode, basePath) {
  const title = item.title[langCode] || item.title['nl'] || item.title['en'];
  const desc = item.shortDescription[langCode] || item.shortDescription['nl'] || item.shortDescription['en'];
  
  const rawEligibility = item.eligibility[langCode] || item.eligibility['nl'] || item.eligibility['en'] || [];
  const eligibilityList = Array.isArray(rawEligibility) ? rawEligibility : [rawEligibility];
  
  const rawSteps = item.howToApply[langCode] || item.howToApply['nl'] || item.howToApply['en'] || [];
  const stepsList = Array.isArray(rawSteps) ? rawSteps : [rawSteps];

  return `
    <div class="detail-container">
      <a href="${basePath}${langCode}/" class="back-link">← ${dict.nav_home}</a>

      <article class="detail-card-main">
        <div class="detail-header-tags">
          <span class="category-chip" data-cat="${item.category}">${dict['cat_' + item.category] || item.category}</span>
          <span class="type-tag">${typeLabel(item, dict)}</span>
          <span class="verification-status">
            <span class="status-dot ${item.verificationStatus}"></span>
            ${item.verificationStatus === 'verificado' ? dict.verified_badge + ' ' + item.lastReviewed : dict.unverified_badge}
          </span>
        </div>

        <h1 class="detail-title">${title}</h1>
        <p class="card-description" style="font-size: 1.2rem; margin-bottom: 2rem;">${desc}</p>

        ${isStale(item.lastReviewed) ? `<div class="stale-badge" style="margin-bottom: 2rem;">🕗 <strong>${dict.stale_badge}</strong></div>` : ''}

        ${item.expiresSoon ? `<div class="expiry-alert-banner" style="margin-bottom: 2rem;">⚠️ <strong>${dict.expires_soon_badge}:</strong> ${item.expiryDate || '30-06-2026'}</div>` : ''}

        ${item.budgetStatus && item.budgetStatus !== 'open' ? `<div class="budget-banner" style="margin-bottom: 2rem;">🚧 <strong>${dict['budget_' + item.budgetStatus]}</strong></div>` : ''}

        ${item.amount ? `<div class="amount-block">
          <span class="amount-block-label">${dict.amount_label}</span>
          <strong class="amount-block-value">${formatAmount(item.amount, dict, langCode)}</strong>
          ${item.type === 'préstamo' ? `<span class="amount-block-note">${dict.amount_loan_note}</span>` : ''}
        </div>` : ''}

        ${item.documentsNeeded && item.documentsNeeded.length ? `<div class="detail-section-block">
          <h3>${dict.documents_title}</h3>
          <ul class="documents-list">
            ${item.documentsNeeded.map(doc => `<li>${dict['doc_' + doc] || doc}</li>`).join('')}
          </ul>
        </div>` : ''}

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

        <aside class="feedback-box">
          <h3 class="feedback-title">${dict.feedback_title}</h3>
          <p class="feedback-intro">${dict.feedback_intro}</p>
          <a href="${renderFeedbackUrl(item, langCode)}" target="_blank" rel="noopener noreferrer" class="feedback-btn">
            ${dict.feedback_btn} ↗
          </a>
        </aside>
      </article>
    </div>
  `;
}

function renderAboutPage(dict, langCode, basePath) {
  return `
    <div class="over-container">
      <a href="${basePath}${langCode}/" class="back-link">← ${dict.nav_home}</a>

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

        ${ANALYTICS_CODE ? `<div class="detail-section-block">
          <h3>Privacy & bezoekcijfers</h3>
          <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1rem;">
            Deze site zet geen cookies, vraagt niet om toestemming en volgt niemand. Om te weten of de regelingen ook echt gevonden worden, tellen we alleen het aantal keer dat een pagina geopend wordt met <a href="https://www.goatcounter.com/" target="_blank" rel="noopener">GoatCounter</a>: geen IP-adres dat bewaard wordt, geen profiel, geen doorverkoop. Wie <em>Do Not Track</em> of <em>Global Privacy Control</em> aan heeft staan, wordt helemaal niet geteld.
          </p>
          <p style="font-size: 1.05rem; line-height: 1.7;">
            De cijfers zijn openbaar: <a href="https://${ANALYTICS_CODE}.goatcounter.com/" target="_blank" rel="noopener">${ANALYTICS_CODE}.goatcounter.com</a>.
          </p>
        </div>

        ` : ''}<div class="detail-section-block">
          <h3>Hoe bijdragen (PR via GitHub)?</h3>
          <p style="font-size: 1.05rem; line-height: 1.7;">
            Ontbreekt er een regeling of klopt een link niet meer? Iedereen kan een wijziging voorstellen via een Pull Request op GitHub. Bewerk eenvoudig <code>data/beneficios.json</code> of dien een issue in via onze sjablonen.
          </p>
          <div style="margin-top: 1.5rem;">
            <a href="https://github.com/utrecht-voor-iedereen/utrecht-voor-jou" target="_blank" rel="noopener" class="official-btn-large">
              Bekijk op GitHub (PR indienen) ↗
            </a>
          </div>
        </div>
      </article>
    </div>
  `;
}

function generateRssFeed(catalog, dict, langCode) {
  const itemsXml = catalog.map(item => {
    const title = item.title[langCode] || item.title['nl'] || item.title['en'];
    const desc = item.shortDescription[langCode] || item.shortDescription['nl'] || item.shortDescription['en'];
    const link = `${SITE_URL}/${langCode}/beneficio/${item.id}/`;

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
    <link>${SITE_URL}/${langCode}/</link>
    <description>${dict.tagline}</description>
    <language>${langCode}</language>
    ${itemsXml}
  </channel>
</rss>`;
}

function generateSitemap(catalog) {
  let urls = [];

  LANGUAGES.forEach(lang => {
    urls.push(`${SITE_URL}/${lang.code}/`);
    urls.push(`${SITE_URL}/${lang.code}/over/`);

    catalog.forEach(item => {
      urls.push(`${SITE_URL}/${lang.code}/beneficio/${item.id}/`);
    });
  });

  const urlElements = urls.map(u => `<url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

function build() {
  console.log('🚀 Starting Utrecht Voor Jou SSG build with relative paths...');
  ensureDir(DIST_DIR);

  const { catalog, locales } = loadData();

  ensureDir(path.join(DIST_DIR, 'rss'));

  ['css', 'js', 'svg', 'img'].forEach(assetDir => {
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

    // 1. Catalog Home Page /<lang>/index.html (depth: 1 -> basePath = '../')
    const homeBasePath = '../';
    const homeContent = renderCatalogHome(catalog, dict, code, homeBasePath);
    const homeHtml = renderHtmlShell({
      title: dict.nav_home,
      description: dict.tagline,
      content: homeContent,
      langCode: code,
      currentSubpath: '/',
      catalogData: catalog,
      dict: dict,
      basePath: homeBasePath
    });
    fs.writeFileSync(path.join(langDir, 'index.html'), homeHtml);

    // 2. About Page /<lang>/over/index.html (depth: 2 -> basePath = '../../')
    const overDir = path.join(langDir, 'over');
    ensureDir(overDir);
    const overBasePath = '../../';
    const overContent = renderAboutPage(dict, code, overBasePath);
    const overHtml = renderHtmlShell({
      title: dict.nav_about,
      description: 'Over het onafhankelijke burgerinitiatief Utrecht Voor Jou',
      content: overContent,
      langCode: code,
      currentSubpath: '/over/',
      catalogData: catalog,
      dict: dict,
      basePath: overBasePath
    });
    fs.writeFileSync(path.join(overDir, 'index.html'), overHtml);

    // 3. Benefit Detail Pages /<lang>/beneficio/<id>/index.html (depth: 3 -> basePath = '../../../')
    catalog.forEach(item => {
      const detailDir = path.join(langDir, 'beneficio', `${item.id}`);
      ensureDir(detailDir);
      const detailBasePath = '../../../';

      const titleText = item.title[code] || item.title['nl'] || item.title['en'];
      const descText = item.shortDescription[code] || item.shortDescription['nl'] || item.shortDescription['en'];
      const detailContent = renderBenefitDetail(item, dict, code, detailBasePath);

      const detailHtml = renderHtmlShell({
        title: titleText,
        description: descText,
        content: detailContent,
        langCode: code,
        currentSubpath: `/beneficio/${item.id}/`,
        catalogData: catalog,
        dict: dict,
        basePath: detailBasePath
      });
      fs.writeFileSync(path.join(detailDir, 'index.html'), detailHtml);
    });

    // 3b. Printable hand-outs /<lang>/print/ and /<lang>/print/<category>/.
    //     Kept out of the index: they are the same content as the catalog, and
    //     a search engine ranking the print sheet above the real page would be
    //     a worse result for the reader.
    const printDir = path.join(langDir, 'print');
    ensureDir(printDir);
    fs.writeFileSync(
      path.join(printDir, 'index.html'),
      renderHtmlShell({
        title: dict.print_index_title,
        description: dict.print_index_intro,
        content: renderPrintIndex(catalog, dict, code, '../../'),
        langCode: code,
        currentSubpath: '/print/',
        // The hand-out pages have no search box and no tip rotator, so the
        // embedded catalog would be ~300 KB of dead weight per sheet.
        catalogData: [],
        dict: dict,
        basePath: '../../',
        noIndex: true
      })
    );

    CATEGORIES.forEach(category => {
      if (!catalog.some(item => item.category === category)) return;
      const categoryDir = path.join(printDir, category);
      ensureDir(categoryDir);
      const categoryName = dict['cat_' + category] || category;
      fs.writeFileSync(
        path.join(categoryDir, 'index.html'),
        renderHtmlShell({
          title: `${categoryName} — ${dict.print_index_title}`,
          description: dict.print_index_intro,
          content: renderPrintSheet(catalog, category, dict, code, '../../../'),
          langCode: code,
          currentSubpath: `/print/${category}/`,
          catalogData: [],
          dict: dict,
          basePath: '../../../',
          noIndex: true
        })
      );
    });

    const rssXml = generateRssFeed(catalog, dict, code);
    fs.writeFileSync(path.join(DIST_DIR, 'rss', `${code}.xml`), rssXml);
  });

  // 4. Root index.html: a real, static language picker.
  //
  //    This used to be a bare <script> that read localStorage and did
  //    location.replace('./nl/'). Two problems, both aimed at exactly the people
  //    this site exists for: without JavaScript the root was a dead end with a
  //    single Dutch link, and a first-time visitor with JavaScript was sent to
  //    Dutch regardless of what language they actually read.
  //
  //    Now the markup itself is the picker, so it works with no JavaScript, no
  //    CSS and no fonts. The script on top is only a shortcut: it honours a
  //    stored choice, and otherwise matches navigator.language against the
  //    locales we actually build. If neither matches, the visitor stays here and
  //    chooses — which beats guessing Dutch at them.
  const rootLangCodes = LANGUAGES.map(l => l.code);
  const rootLinks = LANGUAGES.map(l => {
    const tagline = (locales[l.code] && locales[l.code].tagline) || '';
    return `      <li>
        <a class="lang" href="./${l.code}/" lang="${l.code}" hreflang="${l.code}">
          <span class="code">${l.flag}</span>
          <span class="text"><strong>${l.name}</strong><span class="tagline">${escapeHtml(tagline)}</span></span>
        </a>
      </li>`;
  }).join('\n');
  const rootHreflangs = LANGUAGES
    .map(l => `  <link rel="alternate" hreflang="${l.code}" href="./${l.code}/" />`)
    .join('\n');

  const rootRedirectHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Utrecht Voor Jou</title>
  <meta name="description" content="${escapeHtml(locales.nl.tagline)}">
  <meta name="theme-color" content="#CC0000">
  <link rel="manifest" href="./manifest.webmanifest">
${rootHreflangs}
  <link rel="alternate" hreflang="x-default" href="./nl/" />
  <script>
    // Shortcut only. Every path it can take is also reachable by clicking below.
    (function () {
      var built = ${JSON.stringify(rootLangCodes)};
      var target = null;
      try {
        var stored = localStorage.getItem('utrecht_lang');
        if (stored && built.indexOf(stored) !== -1) target = stored;
      } catch (e) { /* private mode, blocked storage: fall through to the picker */ }
      if (!target) {
        var wanted = (navigator.languages && navigator.languages.length)
          ? navigator.languages
          : [navigator.language || ''];
        for (var i = 0; i < wanted.length && !target; i++) {
          var tag = String(wanted[i]);
          if (built.indexOf(tag) !== -1) { target = tag; break; }          // pt-BR
          var base = tag.split('-')[0];
          if (built.indexOf(base) !== -1) { target = base; }               // pt-PT -> pt
        }
      }
      if (target) {
        var loc = window.location;
        var path = loc.pathname.endsWith('/') ? loc.pathname : loc.pathname + '/';
        loc.replace(path + target + '/');
      }
    })();
  </script>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 2rem 1rem 3rem;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111111; background: #F8F9FA; line-height: 1.5;
    }
    .wrap { max-width: 44rem; margin: 0 auto; }
    header { border-bottom: 4px solid #CC0000; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.75rem; margin: 0 0 .25rem; color: #CC0000; }
    .sub { margin: 0; color: #757575; font-size: .95rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
    a.lang {
      display: flex; align-items: center; gap: 1rem;
      padding: .9rem 1rem; min-height: 44px;
      background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 12px;
      text-decoration: none; color: inherit;
    }
    a.lang:hover, a.lang:focus-visible { border-color: #CC0000; background: #FFF8F8; }
    a.lang:focus-visible { outline: 3px solid #006DFF; outline-offset: 2px; }
    .code {
      flex: 0 0 auto; min-width: 3.25rem; text-align: center;
      font-size: .8rem; font-weight: 700; letter-spacing: .04em;
      color: #FFFFFF; background: #CC0000; border-radius: 4px; padding: .3rem .4rem;
    }
    .text { display: flex; flex-direction: column; gap: .15rem; }
    .tagline { font-size: .85rem; color: #757575; }
    @media (prefers-color-scheme: dark) {
      body { color: #F1F1F1; background: #121212; }
      a.lang { background: #1D1D1D; border-color: #333333; }
      a.lang:hover, a.lang:focus-visible { background: #2A1A1A; }
      .sub, .tagline { color: #A9A9A9; }
      h1 { color: #FF6B6B; }
      .code { background: #FF6B6B; color: #121212; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Utrecht Voor Jou</h1>
      <p class="sub">Kies je taal &middot; Choose your language &middot; Elige tu idioma</p>
    </header>
    <nav aria-label="Taal / Language">
      <ul>
${rootLinks}
      </ul>
    </nav>
  </div>
</body>
</html>`;
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), rootRedirectHtml);

  const sitemapXml = generateSitemap(catalog);
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml);

  // 5. Web app manifest. Every URL is relative to the manifest, so the install
  //    works unchanged on the GitHub Pages subpath and on a custom domain.
  const manifest = {
    name: 'Utrecht Voor Jou',
    short_name: 'Voor Jou',
    description: locales.nl.tagline,
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#CC0000',
    icons: [
      {
        src: './svg/app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  };
  fs.writeFileSync(path.join(DIST_DIR, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

  // 6. Service worker, stamped with the build time so a deploy retires the
  //    caches the previous one left behind.
  const swSource = fs.readFileSync(path.join(ROOT_DIR, 'src', 'sw.js'), 'utf8');
  fs.writeFileSync(
    path.join(DIST_DIR, 'sw.js'),
    swSource.replace('__CACHE_VERSION__', BUILD_ID)
  );

  console.log('✅ SSG Build complete! Generated static site with relative basePaths in dist/');
}

build();
