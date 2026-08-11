/**
 * Utrecht Voor Jou — PR & Data Integrity Validation Script
 * Used by CI/CD (.github/workflows/validate.yml) and local npm test
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'beneficios.json');
const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const REQUIRED_LANGS = ['nl', 'en', 'es', 'de', 'tr', 'fr', 'it', 'pt', 'pt-BR'];

console.log('🔍 Validating Utrecht Voor Jou dataset & schemas...');

let errors = [];

// 1. Verify locales exist
REQUIRED_LANGS.forEach(lang => {
  const locPath = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(locPath)) {
    errors.push(`Missing locale file: locales/${lang}.json`);
  } else {
    try {
      JSON.parse(fs.readFileSync(locPath, 'utf8'));
    } catch (e) {
      errors.push(`Invalid JSON in locales/${lang}.json: ${e.message}`);
    }
  }
});

// 1b. Every locale must carry every key of the Dutch reference. A missing key
// does not crash the build, it renders the literal string "undefined" on the
// page in that language, which nobody notices until a reader reports it.
const nlPath = path.join(LOCALES_DIR, 'nl.json');
if (fs.existsSync(nlPath)) {
  try {
    const reference = JSON.parse(fs.readFileSync(nlPath, 'utf8'));
    const referenceKeys = Object.keys(reference);

    REQUIRED_LANGS.filter(lang => lang !== 'nl').forEach(lang => {
      const locPath = path.join(LOCALES_DIR, `${lang}.json`);
      if (!fs.existsSync(locPath)) return;
      let locale;
      try {
        locale = JSON.parse(fs.readFileSync(locPath, 'utf8'));
      } catch (e) {
        return; // already reported above
      }
      const missing = referenceKeys.filter(key => !(key in locale));
      const extra = Object.keys(locale).filter(key => !referenceKeys.includes(key));
      if (missing.length) errors.push(`locales/${lang}.json is missing keys: ${missing.join(', ')}`);
      if (extra.length) errors.push(`locales/${lang}.json has keys absent from nl.json: ${extra.join(', ')}`);
    });
  } catch (e) {
    // nl.json itself is unparseable; already reported above
  }
}

// 2. Verify data/beneficios.json
if (!fs.existsSync(DATA_FILE)) {
  errors.push(`Dataset file missing: data/beneficios.json`);
} else {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const catalog = JSON.parse(raw);

    if (!Array.isArray(catalog)) {
      errors.push(`data/beneficios.json must be a JSON array`);
    } else {
      console.log(`ℹ️ Catalog contains ${catalog.length} items.`);

      const validCategories = ['verde', 'dinero', 'energia', 'legal', 'cultura', 'movilidad', 'comunidad', 'vida'];
      const validTypes = ['gratis', 'subsidio', 'préstamo', 'servicio'];
      const validStatuses = ['verificado', 'por-verificar'];

      const ids = new Set();

      catalog.forEach((item, index) => {
        const itemRef = `Item #${index + 1} (ID: ${item.id || 'N/A'})`;

        if (!item.id || typeof item.id !== 'number') errors.push(`${itemRef}: 'id' must be a unique number`);
        if (ids.has(item.id)) errors.push(`${itemRef}: Duplicate ID ${item.id}`);
        ids.add(item.id);

        if (!validCategories.includes(item.category)) errors.push(`${itemRef}: Invalid category '${item.category}'`);
        if (!validTypes.includes(item.type)) errors.push(`${itemRef}: Invalid type '${item.type}'`);
        if (!validStatuses.includes(item.verificationStatus)) errors.push(`${itemRef}: Invalid verificationStatus '${item.verificationStatus}'`);

        if (!item.officialUrl || !item.officialUrl.startsWith('http')) errors.push(`${itemRef}: Invalid officialUrl`);

        // searchAliases is optional, but a malformed one silently breaks search
        // instead of erroring, so check the shape when it is present.
        if (item.searchAliases !== undefined) {
          if (typeof item.searchAliases !== 'object' || Array.isArray(item.searchAliases)) {
            errors.push(`${itemRef}: 'searchAliases' must be an object keyed by 'all' or a language code`);
          } else {
            Object.entries(item.searchAliases).forEach(([key, list]) => {
              if (key !== 'all' && !REQUIRED_LANGS.includes(key)) {
                errors.push(`${itemRef}: Unknown searchAliases key '${key}'`);
              }
              if (!Array.isArray(list) || list.some(a => typeof a !== 'string')) {
                errors.push(`${itemRef}: searchAliases.${key} must be an array of strings`);
              }
            });
          }
        }

        // amount, documentsNeeded, budgetStatus and deadline are optional, but
        // a malformed one is worse than a missing one: the catalog would sort
        // or filter on a number that means nothing.
        if (item.amount !== undefined) {
          const a = item.amount;
          if (typeof a !== 'object' || Array.isArray(a)) {
            errors.push(`${itemRef}: 'amount' must be an object`);
          } else {
            if (typeof a.max !== 'number' || a.max < 0) errors.push(`${itemRef}: amount.max must be a number of 0 or more`);
            if (a.min !== undefined && (typeof a.min !== 'number' || a.min < 0)) errors.push(`${itemRef}: amount.min must be a number of 0 or more`);
            if (typeof a.min === 'number' && typeof a.max === 'number' && a.min > a.max) errors.push(`${itemRef}: amount.min is larger than amount.max`);
            if (a.currency !== 'EUR') errors.push(`${itemRef}: amount.currency must be 'EUR'`);
            if (!['once', 'year', 'month'].includes(a.period)) errors.push(`${itemRef}: amount.period must be once, year or month`);
            const known = ['min', 'max', 'currency', 'period'];
            Object.keys(a).filter(k => !known.includes(k)).forEach(k => errors.push(`${itemRef}: unknown key 'amount.${k}'`));
          }
        }

        if (item.documentsNeeded !== undefined) {
          const validDocuments = ['digid', 'upas', 'bsn', 'inkomensbewijs', 'huurcontract', 'zorgbewijs'];
          if (!Array.isArray(item.documentsNeeded)) {
            errors.push(`${itemRef}: 'documentsNeeded' must be an array`);
          } else {
            item.documentsNeeded
              .filter(doc => !validDocuments.includes(doc))
              .forEach(doc => errors.push(`${itemRef}: unknown document '${doc}'`));
          }
        }

        if (item.budgetStatus !== undefined && !['open', 'op', 'gesloten'].includes(item.budgetStatus)) {
          errors.push(`${itemRef}: Invalid budgetStatus '${item.budgetStatus}'`);
        }

        if (!item.title || !item.title.nl) errors.push(`${itemRef}: Missing title.nl`);
        if (!item.shortDescription || !item.shortDescription.nl) errors.push(`${itemRef}: Missing shortDescription.nl`);
        if (!item.eligibility || !item.eligibility.nl) errors.push(`${itemRef}: Missing eligibility.nl`);
        if (!item.howToApply || !item.howToApply.nl) errors.push(`${itemRef}: Missing howToApply.nl`);
      });
    }
  } catch (e) {
    errors.push(`Invalid JSON in data/beneficios.json: ${e.message}`);
  }
}

if (errors.length > 0) {
  console.error('❌ Validation Failed with errors:');
  errors.forEach(err => console.error('  - ' + err));
  process.exit(1);
} else {
  console.log('✅ Dataset and locale schemas validation PASSED successfully!');
  process.exit(0);
}
