/**
 * <efes-facet> — collapsible checkbox facet.
 *
 * Attributes:
 *   field    — document field name to facet on (required)
 *   label    — display label (default: field name)
 *   expanded — if present, starts expanded (default: collapsed)
 *
 * Must be inside <efes-search>.
 * Self-registers with the engine via engine.registerFacet().
 */
export class EfesFacet extends HTMLElement {
    #engine = null;
    #field = null;
    #built = false;

    connectedCallback() {
        const root = this.closest('efes-search');
        if (!root) throw new Error('<efes-facet> must be inside <efes-search>');
        this.#engine = root.engine;

        this.#field = this.getAttribute('field');
        if (!this.#field) throw new Error('<efes-facet>: field attribute is required');

        const expanded = this.hasAttribute('expanded');
        const label = this.getAttribute('label') || this.#field;

        // Register with engine so it computes counts for this field
        this.#engine.registerFacet(this.#field);

        // Build skeleton
        this.className = 'efes-facet';

        const header = document.createElement('div');
        header.className = 'efes-facet-header' + (expanded ? '' : ' collapsed');
        header.textContent = label;
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
        });

        const content = document.createElement('div');
        content.className = 'efes-facet-content' + (expanded ? '' : ' collapsed');

        this.appendChild(header);
        this.appendChild(content);

        // Build facet items once engine is ready
        this.#engine.addEventListener('status-change', (e) => {
            if (e.detail.status === 'ready' && !this.#built) {
                this.#build();
                this.#built = true;
            }
        });

        // Update counts on each filter change
        this.#engine.addEventListener('facets-change', () => {
            if (this.#built) this.#update();
        });
    }

    /** Build the full checkbox list from fullFacetCounts (called once). */
    #build() {
        const counts = this.#engine.fullFacetCounts[this.#field] || {};
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const content = this.querySelector('.efes-facet-content');

        for (const [value, count] of sorted) {
            const item = document.createElement('label');
            item.className = 'efes-facet-item';
            item.setAttribute('data-value', value);

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.addEventListener('change', () => {
                this.#engine.setFacetValue(this.#field, value, cb.checked);
            });

            const text = document.createElement('span');
            text.className = 'efes-facet-label';
            text.textContent = value;

            const countSpan = document.createElement('span');
            countSpan.className = 'efes-facet-count';
            countSpan.textContent = '(' + count + ')';

            item.appendChild(cb);
            item.appendChild(text);
            item.appendChild(countSpan);
            content.appendChild(item);
        }
    }

    /** Update counts and checkbox state in-place (called on each filter change). */
    #update() {
        const counts = this.#engine.facetCounts[this.#field] || {};
        const activeValues = this.#engine.activeFilters[this.#field] || new Set();

        this.querySelectorAll('.efes-facet-item').forEach(item => {
            const value = item.getAttribute('data-value');
            const count = counts[value] || 0;
            item.querySelector('.efes-facet-count').textContent = '(' + count + ')';

            const cb = item.querySelector('input');
            cb.checked = activeValues.has(value);

            if (count === 0 && !cb.checked) {
                item.classList.add('efes-facet-item-disabled');
            } else {
                item.classList.remove('efes-facet-item-disabled');
            }
        });
    }
}
