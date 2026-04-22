# efes-search Component

Reference for the `efes-search` Web Components and the headless `SearchEngine` they wrap. For an introduction to how the components fit together, see the [Search guide](/guide/search). For a step-by-step walkthrough, see the [Search tutorial](/tutorial/search).

## Loading

A scaffolded project includes the bundled component script and stylesheet under `source/website/assets/efes-search/`. They are loaded by the base layout:

```html
<link rel="stylesheet" href="/assets/efes-search/efes-search.css">
<script type="module" src="/assets/efes-search/efes-search.js"></script>
```

The script registers all eight custom elements (`efes-search`, `efes-search-input`, `efes-facet`, `efes-date-range`, `efes-active-filters`, `efes-result-count`, `efes-sort`, `efes-results`) on `customElements`. After registration they're usable anywhere on the page.

---

## `<efes-search>`

Root element. Constructs and owns the `SearchEngine`. All other components find it via `closest('efes-search')`, so they must be descendants.

### Attributes

| Attribute | Default | Description |
|---|---|---|
| `data-url` | — (required) | URL of the documents JSON file |
| `text-fields` | `fullText,title` | Comma-separated list of fields to index for full-text search |
| `match-mode` | `prefix` | `exact`, `prefix`, or `substring`. See [Match modes](/guide/search#match-modes) |

### Behaviour

- Loads the JSON file on the next tick after `connectedCallback`. The deferral lets all descendant components register themselves (especially `<efes-facet>`, which calls `engine.registerFacet()`) before the engine starts indexing.
- Sets `data-status` on itself reflecting engine state (`idle`, `loading`, `ready`, `error`). Useful for CSS-only loading indicators.
- Listens for `data-action="clear-all"` clicks anywhere in its subtree and calls `engine.clearAll()` in response.

### Example

```html
<efes-search data-url="/search-data/documents_en.json"
             text-fields="fullText,title"
             match-mode="prefix">
  <!-- search input, facets, results... -->
</efes-search>
```

---

## `<efes-search-input>`

Debounced text input. Forwards the trimmed query to the engine after a configurable delay, or immediately on Enter.

### Attributes

| Attribute | Default | Description |
|---|---|---|
| `placeholder` | `Search...` | Placeholder text on the input |
| `debounce` | `300` | Debounce delay in milliseconds |

### Behaviour

- Resets to empty when filters are cleared externally (e.g. by the `clear-all` action).
- Renders an `<input type="text" class="efes-search-input">` inside itself.

---

## `<efes-facet>`

Collapsible checkbox list, one option per distinct value of the named field. Counts update as other filters narrow the result set.

### Attributes

| Attribute | Default | Description |
|---|---|---|
| `field` | — (required) | Document field name to facet on |
| `label` | (the field name) | Display label for the facet header |
| `expanded` | absent (collapsed) | If present, starts expanded |

### Behaviour

- Calls `engine.registerFacet(field)` on mount, which registers the field for facet-count computation.
- Builds the checkbox list once when the engine reaches the `ready` state, sorted by descending count.
- On each `facets-change` event, updates counts in place and dims values whose current filtered count is zero (unless they're already selected).
- Multi-valued fields (`<item>` children in the source XML) are handled the same way as scalar fields. Each distinct item value becomes a checkbox.

### Example

```html
<efes-facet field="milieu" label="Milieu" expanded></efes-facet>
```

---

## `<efes-date-range>`

Two number inputs (from / to year) plus a Clear button. Filters documents whose `dateNotBefore`/`dateNotAfter` fields overlap the entered range.

### Attributes

| Attribute | Default | Description |
|---|---|---|
| `label` | `Date Range` | Header label |
| `from-label` | `From year` | Label above the "from" input |
| `to-label` | `To year` | Label above the "to" input |
| `hint` | (none) | Optional helper text below the inputs |
| `expanded` | absent (collapsed) | If present, starts expanded |

### Behaviour

- Filters by overlap between the entered range and each document's `[dateNotBefore, dateNotAfter]` interval. Documents missing both fields aren't filtered out.
- Resets to empty when filters are cleared externally.

### Example

```html
<efes-date-range label="Date Range"
                 hint="Use negative numbers for BCE"
                 expanded>
</efes-date-range>
```

---

## `<efes-active-filters>`

Pills representing active facet filters and the date range, each with a remove button. Reads display labels from sibling `<efes-facet>` elements (so pills say `Milieu: military` rather than `milieu: military`). Renders nothing when no filter is active.

No attributes.

---

## `<efes-result-count>`

Inline element showing the current result count. Two attribute templates with `{count}` and `{total}` placeholders.

### Attributes

| Attribute | Default | Description |
|---|---|---|
| `template` | `{total}` | Pattern used when no filter is active |
| `filtered-template` | `{count} of {total}` | Pattern used when at least one filter is active |

### Example

```html
<efes-result-count
    template="Showing all {total} seals"
    filtered-template="Showing {count} of {total} seals">
</efes-result-count>
```

---

## `<efes-sort>`

Sort dropdown plus a direction toggle button. Each `<field>` child defines a sort option.

### Children

The element is populated from `<field>` children, which are replaced at mount time by the rendered `<select>` and direction button.

| Element | Attributes | Description |
|---|---|---|
| `<field key="…">label</field>` | `key` (required), `numeric` (optional) | Defines a sort option. `key` is the document field; the element text is the dropdown label; `numeric` makes it sort as numbers rather than strings |

The first `<field>` is the default selection. Direction toggles between ascending (`A→Z`) and descending (`Z→A`) on click of the direction button.

### Example

```html
<efes-sort>
    <field key="sortKey">Document ID</field>
    <field key="dateNotBefore" numeric>Earliest Date</field>
    <field key="title">Title</field>
</efes-sort>
```

---

## `<efes-results>`

Renders the actual results list. Uses an inner `<template>` as the markup for each result.

### Attributes

| Attribute | Default | Description |
|---|---|---|
| `result-url` | `{documentId}.html` | URL pattern with `{fieldName}` placeholders |

### Children

| Element | Description |
|---|---|
| `<template>` | The markup cloned for each result. Required for anything beyond the fallback simple link |

### Template conventions

Inside the `<template>`:

- **`data-field="fieldName"`** on any element — its `textContent` is set to the value of that field on the document. Array values are joined with `, `. Empty/missing values get `display: none` + `aria-hidden="true"` so the surrounding markup gracefully collapses.
- **`<a>` without `href`**: `href` is set from the `result-url` pattern. Each `{fieldName}` placeholder is replaced with the value of that field on the document.
- **`<a>` with `href`**: left alone (in case you want a custom link).

Without a `<template>`, `<efes-results>` falls back to a simple link per result using `result-url` and `documentId` as the link text.

### Example

```html
<efes-results result-url="/en/seals/{documentId}/">
    <template>
        <a>
            <div class="efes-result-title">
                <span class="doc-id" data-field="documentId"></span>
                <span data-field="title"></span>
            </div>
            <div class="efes-result-details">
                <span data-field="origDate"></span>
                <span data-field="milieu"></span>
            </div>
        </a>
    </template>
</efes-results>
```

---

## `SearchEngine`

The headless engine instance is exposed at `document.querySelector('efes-search').engine` once `<efes-search>` is connected. Most projects don't touch it, but it's there for custom components or integrations.

### Construction

Constructed automatically by `<efes-search>`. Direct construction is rare:

```javascript
import { SearchEngine } from '/assets/efes-search/efes-search.js';

const engine = new SearchEngine({
    url: '/search-data/documents_en.json',
    textFields: ['fullText', 'title'],
    matchMode: 'prefix',
});
await engine.load();
```

### Properties (read-only)

| Property | Description |
|---|---|
| `status` | `idle`, `loading`, `ready`, or `error` |
| `error` | Error object if `status === 'error'` |
| `results` | Filtered, sorted document array |
| `facetCounts` | `{ field: { value: count } }` for current filtered set |
| `fullFacetCounts` | Same shape, computed across all documents (defines the value universe) |
| `query` | Current query string |
| `activeFilters` | `{ field: Set<value> }` of active facet filters |
| `dateRange` | `{ from, to }` (numbers or `null`) |
| `documentCount` | Total document count |
| `sortField` | Current sort field |
| `sortDirection` | `asc` or `desc` |

### Methods

| Method | Description |
|---|---|
| `load()` | Fetches JSON, builds the index, computes initial facet counts. Returns a Promise |
| `setQuery(query)` | Updates the query and recomputes results |
| `registerFacet(field)` | Registers a field for facet-count computation. Called automatically by `<efes-facet>` |
| `toggleFacet(field, value)` | Toggles whether the value is selected on the field |
| `setFacetValue(field, value, active)` | Explicitly sets the value's selected state |
| `removeFacetFilter(field, value)` | Removes a single value from the field's filter |
| `setDateRange({from, to})` | Sets the date range filter (`null` for either to leave open-ended) |
| `clearDateRange()` | Clears the date range |
| `setSort(field, direction, numeric)` | Sets the sort field, direction (`asc`/`desc`), and whether to compare as numbers |
| `clearAll()` | Clears query, all facet filters, and the date range |
| `hasActiveFilters()` | Returns `true` if any facet, date, or query filter is active |

### Events

`SearchEngine` extends `EventTarget`. Subscribe with `engine.addEventListener(name, handler)`.

| Event | Detail | Fires when |
|---|---|---|
| `status-change` | `{ status }` | Engine status transitions (`idle` → `loading` → `ready` / `error`) |
| `results-change` | `{ results }` | Result set or sort changes |
| `facets-change` | `{ counts }` | Facet counts recomputed (after any filter change) |
| `filters-change` | (none) | Active filters or query changed (fires before `results-change`) |

---

## CSS hooks

The bundled stylesheet provides defaults; the components produce predictable class names you can override.

### Container classes (conventional)

These come from the page markup, not from the components, but the bundled CSS targets them:

| Class | Element | Purpose |
|---|---|---|
| `.efes-facet-sidebar` | sidebar `<aside>` | Sidebar layout |
| `.efes-search-main` | main area `<div>` | Main area layout |
| `.efes-results-bar` | results-bar `<div>` | Result count + sort row |
| `.efes-filter-actions` | clear-all wrapper | Spacing for the clear button |

### Component-produced classes

| Class | Element | Notes |
|---|---|---|
| `.efes-search-input` | `<input>` inside `<efes-search-input>` | The actual text input |
| `.efes-facet` | `<efes-facet>` itself | Set automatically |
| `.efes-facet-header` | facet header | Toggles `.collapsed` on click |
| `.efes-facet-content` | facet body | Toggles `.collapsed` |
| `.efes-facet-item` | facet checkbox row | One per value |
| `.efes-facet-label` | facet item label text | Inside `.efes-facet-item` |
| `.efes-facet-count` | facet item count | The `(N)` after the label |
| `.efes-facet-item-disabled` | facet item with current count 0 | Applied when no current results match |
| `.efes-date-range` | `<efes-date-range>` itself | Set automatically |
| `.efes-date-from`, `.efes-date-to` | from/to inputs | |
| `.efes-date-hint` | `<small>` for hint text | If `hint` attribute set |
| `.efes-clear-dates-btn` | date-range Clear button | |
| `.efes-active-filters-wrapper` | wrapper around filter pills | |
| `.efes-filter-tag` | one filter pill | |
| `.efes-filter-tag-remove` | × button on a pill | |
| `.efes-results-list` | `<ul>` inside `<efes-results>` | |
| `.efes-result-item` | `<li>` per result | |
| `.efes-sort-select` | sort dropdown | |
| `.efes-sort-dir` | direction toggle button | |

### State attribute

`<efes-search>` sets `data-status="idle|loading|ready|error"` on itself. Useful for CSS-only loading indicators:

```css
efes-search[data-status="loading"] .efes-search-main { opacity: 0.5; }
efes-search[data-status="error"] .efes-results-list::after {
    content: "Search failed to load.";
    color: red;
}
```
