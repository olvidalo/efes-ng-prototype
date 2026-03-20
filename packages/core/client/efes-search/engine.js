/**
 * Headless search engine — pure logic, no DOM.
 *
 * Fetches documents.json, builds a FlexSearch index, provides faceted
 * filtering and full-text search. Communicates state changes via events.
 *
 * Events:
 *   status-change  — { status: 'idle'|'loading'|'ready'|'error' }
 *   results-change — after any filter/query recomputation
 *   facets-change  — updated facet counts
 *   filters-change — active filter set changed (facets, date range, or query)
 */
import { Document } from 'flexsearch';

export class SearchEngine extends EventTarget {
    #documents = [];
    #index = null;
    #query = '';
    #facetFields = new Set();
    #facetFilters = {};           // field → Set<string>
    #dateRange = { from: null, to: null };
    #filtered = [];
    #fullFacetCounts = {};        // computed once at load, defines value universe
    #facetCounts = {};            // recomputed on each filter
    #status = 'idle';
    #error = null;
    #url;
    #textFields;

    constructor({ url, textFields = ['fullText', 'title'] }) {
        super();
        this.#url = url;
        this.#textFields = textFields;
    }

    // --- Public read-only properties ---

    get status() { return this.#status; }
    get error() { return this.#error; }
    get results() { return this.#filtered; }
    get facetCounts() { return this.#facetCounts; }
    get fullFacetCounts() { return this.#fullFacetCounts; }
    get query() { return this.#query; }
    get activeFilters() { return this.#facetFilters; }
    get dateRange() { return { ...this.#dateRange }; }
    get documentCount() { return this.#documents.length; }

    // --- Lifecycle ---

    async load() {
        this.#setStatus('loading');
        try {
            const res = await fetch(this.#url);
            if (!res.ok) throw new Error(`Failed to fetch ${this.#url}: ${res.status}`);
            this.#documents = await res.json();

            this.#index = new Document({
                document: { id: 'documentId', index: this.#textFields },
            });
            for (const doc of this.#documents) {
                this.#index.add(doc);
            }

            this.#fullFacetCounts = this.#computeFacetCounts(this.#documents);
            this.#setStatus('ready');
            this.#recompute();
        } catch (err) {
            this.#error = err;
            this.#setStatus('error');
            throw err;
        }
    }

    // --- Facet registration (called by <efes-facet> elements) ---

    registerFacet(field) {
        this.#facetFields.add(field);
        if (!this.#facetFilters[field]) {
            this.#facetFilters[field] = new Set();
        }
        if (this.#status === 'ready') {
            this.#fullFacetCounts = this.#computeFacetCounts(this.#documents);
            this.#recompute();
        }
    }

    // --- Query ---

    setQuery(query) {
        this.#query = query;
        this.#emit('filters-change');
        this.#recompute();
    }

    // --- Facet filters ---

    toggleFacet(field, value) {
        const set = this.#facetFilters[field];
        if (!set) return;
        if (set.has(value)) set.delete(value);
        else set.add(value);
        this.#emit('filters-change');
        this.#recompute();
    }

    setFacetValue(field, value, active) {
        const set = this.#facetFilters[field];
        if (!set) return;
        if (active) set.add(value);
        else set.delete(value);
        this.#emit('filters-change');
        this.#recompute();
    }

    removeFacetFilter(field, value) {
        const set = this.#facetFilters[field];
        if (!set) return;
        set.delete(value);
        this.#emit('filters-change');
        this.#recompute();
    }

    // --- Date range ---

    setDateRange({ from = null, to = null }) {
        this.#dateRange = { from, to };
        this.#emit('filters-change');
        this.#recompute();
    }

    clearDateRange() {
        this.#dateRange = { from: null, to: null };
        this.#emit('filters-change');
        this.#recompute();
    }

    // --- Clear all ---

    clearAll() {
        this.#query = '';
        for (const set of Object.values(this.#facetFilters)) {
            set.clear();
        }
        this.#dateRange = { from: null, to: null };
        this.#emit('filters-change');
        this.#recompute();
    }

    // --- Helpers ---

    hasActiveFilters() {
        if (this.#query) return true;
        if (this.#dateRange.from !== null || this.#dateRange.to !== null) return true;
        for (const values of Object.values(this.#facetFilters)) {
            if (values.size > 0) return true;
        }
        return false;
    }

    // --- Private ---

    #setStatus(status) {
        this.#status = status;
        this.#emit('status-change', { status });
    }

    #emit(name, detail = {}) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }

    #recompute() {
        if (this.#status !== 'ready') return;

        // Full-text search
        let resultIds = null;
        if (this.#query && this.#index) {
            const hits = this.#index.search(this.#query);
            const idSet = new Set();
            for (const fieldResult of hits) {
                for (const id of fieldResult.result) {
                    idSet.add(String(id));
                }
            }
            resultIds = idSet;
        }

        // Start with all docs or text-search subset
        let candidates = resultIds !== null
            ? this.#documents.filter(doc => resultIds.has(String(doc.documentId)))
            : this.#documents;

        // Apply facet filters
        for (const [field, selectedValues] of Object.entries(this.#facetFilters)) {
            if (selectedValues.size === 0) continue;
            candidates = candidates.filter(doc => {
                const val = doc[field];
                if (Array.isArray(val)) {
                    return [...selectedValues].some(v => val.includes(v));
                }
                return selectedValues.has(String(val || ''));
            });
        }

        // Apply date filter
        if (this.#dateRange.from !== null || this.#dateRange.to !== null) {
            candidates = candidates.filter(doc => {
                const notBefore = doc.dateNotBefore;
                const notAfter = doc.dateNotAfter;
                if (notBefore == null && notAfter == null) return false;
                const docStart = notBefore != null ? notBefore : notAfter;
                const docEnd = notAfter != null ? notAfter : notBefore;
                if (this.#dateRange.from !== null && docEnd < this.#dateRange.from) return false;
                if (this.#dateRange.to !== null && docStart > this.#dateRange.to) return false;
                return true;
            });
        }

        // Sort by documentId
        candidates.sort((a, b) => (a.documentId || '').localeCompare(b.documentId || ''));

        this.#filtered = candidates;
        this.#facetCounts = this.#computeFacetCounts(candidates);

        this.#emit('results-change', { results: this.#filtered });
        this.#emit('facets-change', { counts: this.#facetCounts });
    }

    #computeFacetCounts(docs) {
        const result = {};
        for (const field of this.#facetFields) {
            const counts = {};
            for (const doc of docs) {
                const val = doc[field];
                if (Array.isArray(val)) {
                    for (const v of val) {
                        if (v) counts[v] = (counts[v] || 0) + 1;
                    }
                } else if (val) {
                    counts[val] = (counts[val] || 0) + 1;
                }
            }
            result[field] = counts;
        }
        return result;
    }
}
