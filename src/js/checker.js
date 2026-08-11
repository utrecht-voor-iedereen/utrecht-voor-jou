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

  const dict = window.I18N || {};
  // Served from a subpath on GitHub Pages: an absolute "/nl/..." would 404.
  const basePath = window.BASE_PATH || '/';
  const t = (key, fallback) => dict[key] || fallback;

  // Everything the reader could claim, added up. Only schemes with a recorded
  // amount count, and the note under the figure says so: a total that quietly
  // includes free services would be a promise the catalog cannot keep.
  //
  // Loans are left out on purpose. Counting the €300,000 restoration loan as
  // money you can get would turn the headline figure into a lie: it is debt.
  function renderTotal(matched, lang) {
    const withAmount = matched.filter(
      item => item.amount && typeof item.amount.max === 'number' && item.type !== 'préstamo'
    );
    if (!withAmount.length) return '';

    const total = withAmount.reduce((sum, item) => sum + item.amount.max, 0);
    const formatted = new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(total);

    return `
      <div class="checker-total">
        <span class="checker-total-label">${t('checker_total', 'Samen goed voor maximaal')}</span>
        <strong class="checker-total-value">${formatted}</strong>
        <span class="checker-total-note">${t('checker_total_note', '')}</span>
      </div>
    `;
  }

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
          <p style="font-weight: 700; font-size: 1.1rem;">${t('checker_no_results', 'Geen specifieke filters matchen, maar bekijk de algemene regelingen!')}</p>
        </div>
      `;
    } else {
      const totalHtml = renderTotal(matched, currentLang);
      if (totalHtml) resultsGrid.insertAdjacentHTML('beforeend', totalHtml);

      matched.slice(0, 9).forEach(item => {
        const titleText = item.title[currentLang] || item.title['nl'] || item.title['en'];
        const descText = item.shortDescription[currentLang] || item.shortDescription['nl'] || item.shortDescription['en'];
        const detailUrl = `${basePath}${currentLang}/beneficio/${item.id}/`;

        const cardEl = document.createElement('article');
        cardEl.className = 'benefit-card';
        cardEl.innerHTML = `
          <div class="card-header-bar">
            <span class="category-chip" data-cat="${item.category}">${t('cat_' + item.category, item.category)}</span>
            <span class="type-tag">${t('type_' + item.type.replace('é', 'e'), item.type)}</span>
          </div>
          <div class="card-body">
            <h3 class="card-title"><a href="${detailUrl}">${titleText}</a></h3>
            <p class="card-description">${descText}</p>
            <div class="card-footer-meta">
              <span class="verification-status">
                <span class="status-dot ${item.verificationStatus}"></span>
                ${item.verificationStatus === 'verificado'
                  ? `${t('verified_badge', 'Geverifieerd')} ${item.lastReviewed}`
                  : t('unverified_badge', 'Nog te verifiëren')}
              </span>
              <a href="${detailUrl}" class="btn-detail">${t('card_detail_btn', 'Bekijk detail')}</a>
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
