/**
 * Utrecht Voor Jou — Language Switcher & Persistence
 */

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('lang-select');
  if (!langSelect) return;

  const currentLang = document.documentElement.lang || 'nl';
  langSelect.value = currentLang;

  langSelect.addEventListener('change', (e) => {
    const selectedLang = e.target.value;
    if (!selectedLang || selectedLang === currentLang) return;

    // Save choice to localStorage
    try {
      localStorage.setItem('utrecht_lang', selectedLang);
    } catch (err) {
      console.warn('localStorage not accessible:', err);
    }

    // Determine target URL path
    const currentPath = window.location.pathname;
    const supportedLangs = ['nl', 'en', 'es', 'de', 'tr', 'fr', 'it', 'pt', 'pt-BR'];

    let newPath = `/${selectedLang}/`;

    // Check if on detail page or subpage
    const pathParts = currentPath.split('/').filter(Boolean);
    if (pathParts.length > 0 && supportedLangs.includes(pathParts[0])) {
      pathParts[0] = selectedLang;
      newPath = '/' + pathParts.join('/') + '/';
    }

    window.location.href = newPath;
  });
});
