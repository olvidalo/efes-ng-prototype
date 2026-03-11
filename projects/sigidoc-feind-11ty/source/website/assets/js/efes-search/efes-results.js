/**
 * <efes-results> — renders search results using a <template> child.
 *
 * Attributes:
 *   result-url — URL pattern with {fieldName} placeholders
 *                (e.g. "/en/seals/{documentId}.html")
 *
 * Template system:
 *   Child <template> contains the markup for each result.
 *   Elements with data-field="fieldName" get their textContent set from the doc.
 *   <a> elements without href get href set from the result-url pattern.
 *   Empty/missing fields get display:none + aria-hidden.
 *
 * Must be inside <efes-search>.
 */
export class EfesResults extends HTMLElement {
    #engine = null;
    #template = null;
    #resultUrl = null;
    #statusEl = null;
    #listEl = null;

    connectedCallback() {
        const root = this.closest('efes-search');
        if (!root) throw new Error('<efes-results> must be inside <efes-search>');
        this.#engine = root.engine;

        this.#template = this.querySelector('template');
        this.#resultUrl = this.getAttribute('result-url') || '{documentId}.html';

        // Create status and list elements
        this.#statusEl = document.createElement('p');
        this.#statusEl.className = 'efes-results-status';
        this.#statusEl.textContent = 'Loading...';

        this.#listEl = document.createElement('ul');
        this.#listEl.className = 'efes-results-list';
        this.#listEl.style.display = 'none';

        this.appendChild(this.#statusEl);
        this.appendChild(this.#listEl);

        // Loading / error states
        this.#engine.addEventListener('status-change', (e) => {
            const { status } = e.detail;
            if (status === 'loading') {
                this.#statusEl.textContent = 'Loading search data...';
                this.#statusEl.style.display = '';
                this.#listEl.style.display = 'none';
            } else if (status === 'error') {
                this.#statusEl.textContent = 'Error loading search data: ' + this.#engine.error?.message;
                this.#statusEl.style.display = '';
                this.#listEl.style.display = 'none';
            }
        });

        // Render results
        this.#engine.addEventListener('results-change', () => this.#render());
    }

    #render() {
        const results = this.#engine.results;
        const query = this.#engine.query;
        const hasFilters = this.#engine.hasActiveFilters();

        // Status text
        if (query && hasFilters) {
            this.#statusEl.textContent = 'Found ' + results.length + ' result(s) for "' + query + '" with filters:';
        } else if (query) {
            this.#statusEl.textContent = 'Found ' + results.length + ' result(s) for "' + query + '":';
        } else if (hasFilters) {
            this.#statusEl.textContent = 'Found ' + results.length + ' document(s) matching filters:';
        } else {
            this.#statusEl.textContent = 'Showing all ' + results.length + ' documents:';
        }

        this.#statusEl.style.display = '';
        this.#listEl.style.display = '';
        this.#listEl.innerHTML = '';

        for (const doc of results) {
            const li = document.createElement('li');
            li.className = 'efes-result-item';

            if (this.#template) {
                const clone = this.#template.content.cloneNode(true);

                // Fill data-field elements
                clone.querySelectorAll('[data-field]').forEach(el => {
                    const field = el.getAttribute('data-field');
                    const val = doc[field];
                    if (val != null && val !== '') {
                        el.textContent = Array.isArray(val) ? val.join(', ') : String(val);
                    } else {
                        el.style.display = 'none';
                        el.setAttribute('aria-hidden', 'true');
                    }
                });

                // Set href on <a> elements without explicit href
                clone.querySelectorAll('a:not([href])').forEach(a => {
                    a.href = this.#resultUrl.replace(
                        /\{(\w+)\}/g,
                        (_, field) => doc[field] ?? '',
                    );
                });

                li.appendChild(clone);
            } else {
                // Fallback: simple link with documentId
                const link = document.createElement('a');
                link.href = this.#resultUrl.replace(
                    /\{(\w+)\}/g,
                    (_, field) => doc[field] ?? '',
                );
                link.textContent = doc.documentId || '';
                li.appendChild(link);
            }

            this.#listEl.appendChild(li);
        }
    }
}
