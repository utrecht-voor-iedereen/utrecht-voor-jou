/**
 * Utrecht Voor Jou — Language Switcher & Persistence
 * Preserves relative base paths for GitHub Pages subpath compatibility
 */

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('lang-select');
  if (!langSelect) return;

  const currentLang = document.documentElement.lang || 'nl';
  langSelect.value = currentLang;

  langSelect.addEventListener('change', (e) => {
    const selectedLang = e.target.value;
    if (!selectedLang || selectedLang === currentLang) return;

    try {
      localStorage.setItem('utrecht_lang', selectedLang);
    } catch (err) {
      console.warn('localStorage not accessible:', err);
    }

    // Stay on the same page in the other language: every page lives at the
    // same path under each language folder. It used to always go to the
    // language's home page, dropping the reader from the scheme they were on.
    const marker = `/${currentLang}/`;
    const path = window.location.pathname;
    const at = path.indexOf(marker);
    if (at !== -1) {
      window.location.href = path.slice(0, at) + `/${selectedLang}/` + path.slice(at + marker.length) + window.location.search;
      return;
    }
    const basePath = window.BASE_PATH || '../';
    window.location.href = `${basePath}${selectedLang}/`;
  });
});
