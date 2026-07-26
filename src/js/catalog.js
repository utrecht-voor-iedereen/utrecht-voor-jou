/**
 * Utrecht Voor Jou — Live Search, Filtering & "Wist je dat...?" Rotator
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

      const matchesSearch = !searchTerm || title.includes(searchTerm) || desc.includes(searchTerm);
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
  if (searchInput) searchInput.addEventListener('input', filterCatalog);
  if (catSelect) catSelect.addEventListener('change', filterCatalog);
  if (typeSelect) typeSelect.addEventListener('change', filterCatalog);
  if (wijkSelect) wijkSelect.addEventListener('change', filterCatalog);
  if (profileSelect) profileSelect.addEventListener('change', filterCatalog);

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
