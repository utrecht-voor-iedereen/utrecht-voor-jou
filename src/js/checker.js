/**
 * Utrecht Voor Jou — Interactive "Heb ik recht?" Eligibility Checker
 * 100% client-side calculation. Zero tracking, zero network calls.
 */

document.addEventListener('DOMContentLoaded', () => {
  const checkerForm = document.getElementById('checker-form');
  const resultsContainer = document.getElementById('checker-results');
  const resultsGrid = document.getElementById('checker-results-grid');
  const countBadge = document.getElementById('checker-results-count');

  if (!checkerForm || !resultsContainer || !resultsGrid) return;

  checkerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const age = document.getElementById('checker-age')?.value || 'all';
    const income = document.getElementById('checker-income')?.value || 'all';
    const wijk = document.getElementById('checker-wijk')?.value || 'all';
    const profile = document.getElementById('checker-profile')?.value || 'all';

    // Retrieve catalog dataset from global window variable or DOM data attribute
    const catalog = window.BENEFICIOS_DATA || [];
    const currentLang = document.documentElement.lang || 'nl';

    // Filter logic
    const matched = catalog.filter(item => {
      // Wijk filter
      if (wijk !== 'all' && item.wijk !== 'all' && item.wijk !== wijk) {
        return false;
      }

      // Profile filter
      if (profile !== 'all') {
        if (!item.profiles.includes(profile) && !item.profiles.includes('iedereen')) {
          return false;
        }
      }

      // Income filter rule: low-income items
      if (income === 'low' && !item.profiles.includes('lage-inkomens') && !item.profiles.includes('iedereen')) {
        // keep general items
      } else if (income === 'high' && item.profiles.includes('lage-inkomens') && !item.profiles.includes('iedereen')) {
        return false;
      }

      // Age filter
      if (age === 'youth' && item.id !== 35 && item.id !== 19 && item.id !== 21 && !item.profiles.includes('gezin') && !item.profiles.includes('iedereen')) {
        return false;
      }

      return true;
    });

    // Render results
    resultsGrid.innerHTML = '';
    if (countBadge) countBadge.textContent = matched.length;

    if (matched.length === 0) {
      resultsGrid.innerHTML = `
        <div class="no-results-msg" style="grid-column: 1/-1; padding: 2rem; text-align: center;">
          <p style="font-weight: 700; font-size: 1.1rem;">Geen specifieke filters matchen, maar bekijk de algemene regelingen!</p>
        </div>
      `;
    } else {
      matched.slice(0, 9).forEach(item => {
        const titleText = item.title[currentLang] || item.title['nl'] || item.title['en'];
        const descText = item.shortDescription[currentLang] || item.shortDescription['nl'] || item.shortDescription['en'];
        const detailUrl = `/${currentLang}/beneficio/${item.id}/`;

        const cardEl = document.createElement('article');
        cardEl.className = 'benefit-card';
        cardEl.innerHTML = `
          <div class="card-header-bar">
            <span class="category-chip" data-cat="${item.category}">${item.category}</span>
            <span class="type-tag">${item.type}</span>
          </div>
          <div class="card-body">
            <h3 class="card-title"><a href="${detailUrl}">${titleText}</a></h3>
            <p class="card-description">${descText}</p>
            <div class="card-footer-meta">
              <span class="verification-status">
                <span class="status-dot ${item.verificationStatus}"></span>
                ${item.verificationStatus === 'verificado' ? 'Geverifieerd' : 'Por verificar'}
              </span>
              <a href="${detailUrl}" class="btn-detail">Bekijk detail</a>
            </div>
          </div>
        `;
        resultsGrid.appendChild(cardEl);
      });
    }

    // Reveal container & trigger SVG checkmark animation
    resultsContainer.classList.add('active');
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});
