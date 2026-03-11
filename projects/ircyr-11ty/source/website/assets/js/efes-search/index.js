/**
 * EFES Search — registration entry point.
 *
 * Import this module to register all custom elements:
 *   <script type="module" src="/assets/js/efes-search/index.js"></script>
 */
export { SearchEngine } from './engine.js';
export { EfesSearch } from './efes-search.js';
export { EfesSearchInput } from './efes-search-input.js';
export { EfesFacet } from './efes-facet.js';
export { EfesDateRange } from './efes-date-range.js';
export { EfesActiveFilters } from './efes-active-filters.js';
export { EfesResults } from './efes-results.js';

import { EfesSearch } from './efes-search.js';
import { EfesSearchInput } from './efes-search-input.js';
import { EfesFacet } from './efes-facet.js';
import { EfesDateRange } from './efes-date-range.js';
import { EfesActiveFilters } from './efes-active-filters.js';
import { EfesResults } from './efes-results.js';

customElements.define('efes-search', EfesSearch);
customElements.define('efes-search-input', EfesSearchInput);
customElements.define('efes-facet', EfesFacet);
customElements.define('efes-date-range', EfesDateRange);
customElements.define('efes-active-filters', EfesActiveFilters);
customElements.define('efes-results', EfesResults);
