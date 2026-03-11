/**
 * <efes-search-input> — text input with debounced search.
 *
 * Attributes:
 *   placeholder — input placeholder text (default: "Search...")
 *   debounce    — debounce delay in ms (default: 300)
 *
 * Must be inside <efes-search>.
 */
export class EfesSearchInput extends HTMLElement {
    #engine = null;
    #input = null;
    #timer = null;

    connectedCallback() {
        const root = this.closest('efes-search');
        if (!root) throw new Error('<efes-search-input> must be inside <efes-search>');
        this.#engine = root.engine;

        const debounceMs = parseInt(this.getAttribute('debounce') || '300', 10);
        const placeholder = this.getAttribute('placeholder') || 'Search...';

        this.#input = document.createElement('input');
        this.#input.type = 'text';
        this.#input.placeholder = placeholder;
        this.#input.autocomplete = 'off';
        this.#input.className = 'efes-search-input';
        this.appendChild(this.#input);

        // Debounced input
        this.#input.addEventListener('input', () => {
            clearTimeout(this.#timer);
            this.#timer = setTimeout(() => {
                this.#engine.setQuery(this.#input.value.trim());
            }, debounceMs);
        });

        // Immediate on Enter
        this.#input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(this.#timer);
                this.#engine.setQuery(this.#input.value.trim());
            }
        });

        // Sync input when query is cleared externally (e.g. clearAll)
        this.#engine.addEventListener('filters-change', () => {
            if (!this.#engine.query && this.#input.value) {
                this.#input.value = '';
            }
        });
    }
}
