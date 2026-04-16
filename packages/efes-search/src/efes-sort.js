/**
 * <efes-sort> — sort control for search results.
 *
 * Usage:
 *   <efes-sort>
 *       <field key="documentId">Document ID</field>
 *       <field key="dateNotBefore" numeric>Earliest Date</field>
 *   </efes-sort>
 *
 * Each <field> defines a sort option:
 *   key      — the document field to sort by (required)
 *   numeric  — if present, sort numerically instead of alphabetically
 *
 * The first <field> is the default sort.
 */
export class EfesSort extends HTMLElement {
    #engine = null;
    #select = null;
    #dirButton = null;
    #fields = [];
    #direction = 'asc';

    connectedCallback() {
        // Parse <field> children
        this.#fields = [...this.querySelectorAll('field')].map(el => ({
            key: el.getAttribute('key'),
            label: el.textContent.trim(),
            numeric: el.hasAttribute('numeric'),
        }));
        if (this.#fields.length === 0) return;

        // Build UI
        this.#select = document.createElement('select');
        this.#select.className = 'efes-sort-select';
        for (const field of this.#fields) {
            const opt = document.createElement('option');
            opt.value = field.key;
            opt.textContent = field.label;
            this.#select.appendChild(opt);
        }

        this.#dirButton = document.createElement('button');
        this.#dirButton.className = 'efes-sort-dir';
        this.#dirButton.textContent = 'A→Z';
        this.#dirButton.title = 'Toggle sort direction';

        // Clear children (the <field> elements) and replace with UI
        this.innerHTML = '';
        this.appendChild(this.#select);
        this.appendChild(this.#dirButton);

        // Events
        this.#select.addEventListener('change', () => this.#apply());
        this.#dirButton.addEventListener('click', () => {
            this.#direction = this.#direction === 'asc' ? 'desc' : 'asc';
            this.#dirButton.textContent = this.#direction === 'asc' ? 'A→Z' : 'Z→A';
            this.#apply();
        });

        // Connect to engine
        const root = this.closest('efes-search');
        if (root) {
            const tryConnect = () => {
                if (root.engine) {
                    this.#engine = root.engine;
                    this.#apply();
                } else {
                    setTimeout(tryConnect, 10);
                }
            };
            tryConnect();
        }
    }

    #apply() {
        if (!this.#engine) return;
        const field = this.#fields.find(f => f.key === this.#select.value);
        if (field) {
            this.#engine.setSort(field.key, this.#direction, field.numeric);
        }
    }
}
