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

    const basePath = window.BASE_PATH || '../';
    window.location.href = `${basePath}${selectedLang}/`;
  });
});
