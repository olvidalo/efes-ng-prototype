import { SearchEngine } from './engine.js';

/**
 * <efes-search> — root element that creates and owns the SearchEngine.
 *
 * Attributes:
 *   data-url      — URL to documents.json (required)
 *   text-fields   — comma-separated fields to index (default: "fullText,title")
 *   match-mode    — "exact", "prefix", or "substring" (default: "prefix")
 *
 * Children access the engine via: this.closest('efes-search').engine
 *
 * Handles data-action="clear-all" clicks from any descendant.
 */
export class EfesSearch extends HTMLElement {
    #engine = null;

    get engine() { return this.#engine; }

    connectedCallback() {
        const url = this.getAttribute('data-url');
        if (!url) throw new Error('<efes-search>: data-url attribute is required');

        const textFields = this.getAttribute('text-fields')
            ?.split(',').map(s => s.trim())
            || ['fullText', 'title'];
        const matchMode = this.getAttribute('match-mode') || 'prefix';

        this.#engine = new SearchEngine({ url, textFields, matchMode });

        // Reflect engine status as data attribute for CSS targeting
        this.#engine.addEventListener('status-change', (e) => {
            this.setAttribute('data-status', e.detail.status);
        });

        // Handle clear-all action from any descendant button
        this.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.getAttribute('data-action');
            if (action === 'clear-all') {
                this.#engine.clearAll();
            }
        });

        // Defer load to after all children have connected (custom element upgrade order)
        setTimeout(() => this.#engine.load(), 0);
    }
}
