/**
 * <efes-result-count> — inline element showing the current result count.
 *
 * Attributes:
 *   template          — pattern for unfiltered state (default: "{total}")
 *   filtered-template — pattern for filtered state (default: "{count} of {total}")
 *
 * Placeholders:
 *   {count} — number of results after filtering
 *   {total} — total number of documents
 *
 * Examples:
 *   <efes-result-count></efes-result-count>
 *     → "110" or "23 of 110"
 *
 *   <efes-result-count
 *       template="Showing all {total} seals"
 *       filtered-template="Showing {count} of {total} seals">
 *   </efes-result-count>
 *     → "Showing all 110 seals" or "Showing 23 of 110 seals"
 *
 * Must be inside <efes-search>.
 */
export class EfesResultCount extends HTMLElement {
    connectedCallback() {
        this.style.display = 'inline';
        const root = this.closest('efes-search');
        if (!root) return;
        const tpl = this.getAttribute('template') || '{total}';
        const filteredTpl = this.getAttribute('filtered-template') || '{count} of {total}';

        const tryConnect = () => {
            if (root.engine) {
                const engine = root.engine;
                const update = () => {
                    const total = engine.documentCount;
                    const count = engine.results.length;
                    const pattern = engine.hasActiveFilters() ? filteredTpl : tpl;
                    this.textContent = pattern
                        .replace('{count}', count)
                        .replace('{total}', total);
                };
                engine.addEventListener('results-change', update);
                engine.addEventListener('status-change', (e) => {
                    if (e.detail.status === 'ready') update();
                });
            } else {
                setTimeout(tryConnect, 10);
            }
        };
        tryConnect();
    }
}
