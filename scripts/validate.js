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
