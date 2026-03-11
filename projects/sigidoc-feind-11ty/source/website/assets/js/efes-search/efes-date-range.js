/**
 * <efes-date-range> — date range filter with from/to year inputs.
 *
 * Attributes:
 *   label      — header label (default: "Date Range")
 *   from-label — label for "from" input (default: "From year")
 *   to-label   — label for "to" input (default: "To year")
 *   hint       — helper text below inputs (optional, e.g. "Use negative for BCE")
 *   expanded   — if present, starts expanded (default: collapsed)
 *
 * Must be inside <efes-search>.
 */
export class EfesDateRange extends HTMLElement {
    #engine = null;
    #fromInput = null;
    #toInput = null;

    connectedCallback() {
        const root = this.closest('efes-search');
        if (!root) throw new Error('<efes-date-range> must be inside <efes-search>');
        this.#engine = root.engine;

        const label = this.getAttribute('label') || 'Date Range';
        const fromLabel = this.getAttribute('from-label') || 'From year';
        const toLabel = this.getAttribute('to-label') || 'To year';
        const hint = this.getAttribute('hint') || '';
        const expanded = this.hasAttribute('expanded');

        this.className = 'efes-date-range';

        // Header
        const header = document.createElement('div');
        header.className = 'efes-facet-header' + (expanded ? '' : ' collapsed');
        header.textContent = label;

        // Content
        const content = document.createElement('div');
        content.className = 'efes-facet-content' + (expanded ? '' : ' collapsed');

        // From input
        const fromLabelEl = document.createElement('label');
        fromLabelEl.textContent = fromLabel;
        this.#fromInput = document.createElement('input');
        this.#fromInput.type = 'number';
        this.#fromInput.className = 'efes-date-from';
        this.#fromInput.placeholder = 'e.g. 500';
        fromLabelEl.appendChild(this.#fromInput);

        // To input
        const toLabelEl = document.createElement('label');
        toLabelEl.textContent = toLabel;
        this.#toInput = document.createElement('input');
        this.#toInput.type = 'number';
        this.#toInput.className = 'efes-date-to';
        this.#toInput.placeholder = 'e.g. 1200';
        toLabelEl.appendChild(this.#toInput);

        // Inputs wrapper
        const inputs = document.createElement('div');
        inputs.className = 'efes-date-range-inputs';
        inputs.appendChild(fromLabelEl);
        inputs.appendChild(toLabelEl);

        if (hint) {
            const hintEl = document.createElement('small');
            hintEl.className = 'efes-date-hint';
            hintEl.textContent = hint;
            inputs.appendChild(hintEl);
        }

        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'efes-clear-dates-btn';
        clearBtn.textContent = 'Clear';
        clearBtn.type = 'button';

        content.appendChild(inputs);
        content.appendChild(clearBtn);
        this.appendChild(header);
        this.appendChild(content);

        // Toggle collapse
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
        });

        // Date change
        const onDateChange = () => {
            const from = this.#fromInput.value ? parseInt(this.#fromInput.value, 10) : null;
            const to = this.#toInput.value ? parseInt(this.#toInput.value, 10) : null;
            this.#engine.setDateRange({ from, to });
        };
        this.#fromInput.addEventListener('change', onDateChange);
        this.#toInput.addEventListener('change', onDateChange);

        // Clear
        clearBtn.addEventListener('click', () => {
            this.#fromInput.value = '';
            this.#toInput.value = '';
            this.#engine.clearDateRange();
        });

        // Sync when filters cleared externally
        this.#engine.addEventListener('filters-change', () => {
            const range = this.#engine.dateRange;
            if (range.from === null && range.to === null) {
                this.#fromInput.value = '';
                this.#toInput.value = '';
            }
        });
    }
}
