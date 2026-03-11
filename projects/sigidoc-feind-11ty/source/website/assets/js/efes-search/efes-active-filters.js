/**
 * <efes-active-filters> — displays active filter tags with remove buttons.
 *
 * Reads facet labels from sibling <efes-facet> elements for display.
 * Must be inside <efes-search>.
 */
export class EfesActiveFilters extends HTMLElement {
    #engine = null;

    connectedCallback() {
        const root = this.closest('efes-search');
        if (!root) throw new Error('<efes-active-filters> must be inside <efes-search>');
        this.#engine = root.engine;

        this.#engine.addEventListener('results-change', () => this.#render());
    }

    #getFacetLabel(field) {
        const root = this.closest('efes-search');
        const facetEl = root?.querySelector(`efes-facet[field="${field}"]`);
        return facetEl?.getAttribute('label') || field;
    }

    #render() {
        this.innerHTML = '';
        const tags = [];

        // Date range tag
        const range = this.#engine.dateRange;
        if (range.from !== null || range.to !== null) {
            const fromStr = range.from !== null ? range.from : '...';
            const toStr = range.to !== null ? range.to : '...';
            tags.push({
                label: 'Date: ' + fromStr + ' \u2013 ' + toStr,
                onRemove: () => this.#engine.clearDateRange(),
            });
        }

        // Facet filter tags
        const filters = this.#engine.activeFilters;
        for (const [field, values] of Object.entries(filters)) {
            const fieldLabel = this.#getFacetLabel(field);
            for (const value of values) {
                tags.push({
                    label: fieldLabel + ': ' + value,
                    onRemove: () => this.#engine.removeFacetFilter(field, value),
                });
            }
        }

        if (tags.length === 0) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'efes-active-filters-wrapper';

        for (const tag of tags) {
            const el = document.createElement('span');
            el.className = 'efes-filter-tag';
            el.textContent = tag.label + ' ';

            const btn = document.createElement('button');
            btn.className = 'efes-filter-tag-remove';
            btn.textContent = '\u00d7';
            btn.type = 'button';
            btn.addEventListener('click', tag.onRemove);

            el.appendChild(btn);
            wrapper.appendChild(el);
        }

        this.appendChild(wrapper);
    }
}
