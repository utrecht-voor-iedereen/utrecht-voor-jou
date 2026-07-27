/**
 * Utrecht Voor Jou — Live Search, Filtering & "Wist je dat...?" Rotator
 *
 * The active search term and filters are mirrored into the query string, so a
 * filtered view ("everything free in Overvecht") can be shared as a link and
 * the back button undoes a filter instead of leaving the page.
 */

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const catSelect = document.getElementById('filter-category');
  const typeSelect = document.getElementById('filter-type');
  const wijkSelect = document.getElementById('filter-wijk');
  const profileSelect = document.getElementById('filter-profile');
  const cardsContainer = document.getElementById('cards-grid');
  const countDisplay = document.getElementById('visible-count');

  const wistJeDatText = document.getElementById('wist-je-dat-text');
  const wistJeDatLink = document.getElementById('wist-je-dat-link');
  const wistJeDatBtn = document.getElementById('wist-je-dat-next-btn');

  const catalog = window.BENEFICIOS_DATA || [];
  const currentLang = document.documentElement.lang || 'nl';

  // Query string key -> control. Selects fall back to 'all', the search box to ''.
  const URL_STATE = [
    { key: 'q', el: searchInput, empty: '' },
    { key: 'cat', el: catSelect, empty: 'all' },
    { key: 'type', el: typeSelect, empty: 'all' },
    { key: 'wijk', el: wijkSelect, empty: 'all' },
    { key: 'profile', el: profileSelect, empty: 'all' }
  ];

  function applyStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    URL_STATE.forEach(({ key, el, empty }) => {
      if (!el) return;
      const value = params.get(key);
      if (value === null) {
        el.value = empty;
        return;
      }
      // Ignore a value the select does not offer, so a stale or hand-edited
      // link degrades to "no filter" rather than hiding every card.
      if (el.tagName === 'SELECT' && !Array.from(el.options).some(o => o.value === value)) {
        el.value = empty;
        return;
      }
      el.value = value;
    });
  }

  function writeStateToUrl(usePushState) {
    const params = new URLSearchParams(window.location.search);
    URL_STATE.forEach(({ key, el, empty }) => {
      if (!el) return;
      const value = el.value.trim();
      if (!value || value === empty) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    const url = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
    // Selecting a filter is a discrete action worth a history entry; typing in
    // the search box is not, or every keystroke would need its own back press.
    if (usePushState) {
      window.history.pushState(null, '', url);
    } else {
      window.history.replaceState(null, '', url);
    }
  }

  // Terms that should match a card even when they appear in no visible text:
  // the Dutch programme name someone was told at the counter, or the everyday
  // word for it in the language they are browsing in.
  function aliasesFor(item) {
    if (!item.searchAliases) return [];
    const forLang = item.searchAliases[currentLang] || [];
    const shared = item.searchAliases.all || [];
    return forLang.concat(shared).map(a => String(a).toLowerCase());
  }

  // Function to update cards visibility based on search and filters
  function filterCatalog() {
    if (!cardsContainer) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCat = catSelect ? catSelect.value : 'all';
    const selectedType = typeSelect ? typeSelect.value : 'all';
    const selectedWijk = wijkSelect ? wijkSelect.value : 'all';
    const selectedProfile = profileSelect ? profileSelect.value : 'all';

    const cards = cardsContainer.querySelectorAll('.benefit-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const id = parseInt(card.dataset.id, 10);
      const item = catalog.find(b => b.id === id);

      if (!item) return;

      const title = (item.title[currentLang] || item.title['nl'] || '').toLowerCase();
      const desc = (item.shortDescription[currentLang] || item.shortDescription['nl'] || '').toLowerCase();

      const matchesSearch =
        !searchTerm ||
        title.includes(searchTerm) ||
        desc.includes(searchTerm) ||
        aliasesFor(item).some(alias => alias.includes(searchTerm));
      const matchesCat = selectedCat === 'all' || item.category === selectedCat;
      const matchesType = selectedType === 'all' || item.type === selectedType;
      const matchesWijk = selectedWijk === 'all' || item.wijk === 'all' || item.wijk === selectedWijk;
      const matchesProfile = selectedProfile === 'all' || item.profiles.includes(selectedProfile) || item.profiles.includes('iedereen');

      if (matchesSearch && matchesCat && matchesType && matchesWijk && matchesProfile) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (countDisplay) {
      countDisplay.textContent = visibleCount;
    }
  }

  // Event listeners for filters
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterCatalog();
      writeStateToUrl(false);
    });
  }
  [catSelect, typeSelect, wijkSelect, profileSelect].forEach(select => {
    if (!select) return;
    select.addEventListener('change', () => {
      filterCatalog();
      writeStateToUrl(true);
    });
  });

  // Restore the view a shared link points at, and keep back/forward in sync.
  window.addEventListener('popstate', () => {
    applyStateFromUrl();
    filterCatalog();
  });

  applyStateFromUrl();
  filterCatalog();

  // Wist je dat...? Rotator
  function rotateWistJeDat() {
    if (!wistJeDatText || catalog.length === 0) return;

    const randomIndex = Math.floor(Math.random() * catalog.length);
    const item = catalog[randomIndex];

    const title = item.title[currentLang] || item.title['nl'] || item.title['en'];
    const desc = item.shortDescription[currentLang] || item.shortDescription['nl'] || item.shortDescription['en'];
    const url = `/${currentLang}/beneficio/${item.id}/`;

    wistJeDatText.innerHTML = `<strong>${title}:</strong> ${desc}`;
    if (wistJeDatLink) {
      wistJeDatLink.href = url;
    }
  }

  if (wistJeDatBtn) {
    wistJeDatBtn.addEventListener('click', rotateWistJeDat);
  }

  // Initial call
  rotateWistJeDat();
});
