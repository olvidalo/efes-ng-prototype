# Multi-Language Architecture

Publishing your edition in multiple languages involves three independent translation layers. This page explains what each layer does and how they relate.

> [!IMPORTANT] Prototype Note
> Unfortunately, this is complex. The three layers exist because we are combining components developed independently, and each brought its own approach. In a future version, these should ideally be unified into a single source of truth, for example by having the stylesheets read their labels from the same translation files the website templates use. This might require upstream changes in the EpiDoc/SigiDoc stylesheets and is beyond the scope of this prototype. 

## The Three Layers

### 1. Source Content

Your XML documents contain content in multiple languages, encoded with `xml:lang` attributes:

```xml
<objectType>
    <term>
        <seg xml:lang="en">Seal</seg>
        <seg xml:lang="de">Siegel</seg>
        <seg xml:lang="el">Μολυβδόβουλλο</seg>
    </term>
</objectType>
```

**How it's handled:** The `prune-to-language` pipeline node filters the XML to a single language before transformation. You run one pipeline chain per language (`prune-epidoc-english`, `prune-epidoc-german`, etc.) each producing a language-specific version of the content.

> [!tip] Origin
> This prune-before-render approach comes from Kiln/EFES, where the EpiDoc stylesheets render all content they receive, so filtering by `xml:lang` must happen upstream. The `prunce-to-language.xsl` stylesheet included in the project template (scaffold) is directly taken from Kiln.

### 2. XSLT UI Labels

The EpiDoc/SigiDoc stylesheets output placeholder tags for UI labels like "Material", "Type", "Dating":

```xml
<i18n:text i18n:key="material"/>
```

**How it's handled:** The `epidoc-to-html.xsl` wrapper resolves these placeholders using translation files in `source/translations/` (`messages_en.xml`, `messages_de.xml`, etc.). The `language` pipeline parameter selects which file to use.

> [!tip] Origin
> This is how the EpiDoc/SigiDoc stylesheet developers implement multilingual UI labels  using Cocoon's `i18n:text` convention, which the EFES-NG wrapper resolves at XSLT time instead of at runtime.

### 3. Website Shell

The website templates (header, footer, navigation, index pages, homepage) contain text that needs translating: menu labels, page titles, button text, etc.

**How it's handled:** Eleventy data files provide translations per language. Templates use `permalink` with a language variable to generate pages at language-specific URLs (`/en/seals/`, `/de/seals/`, `/el/seals/`).

> [!tip] Origin
> This uses Eleventy's standard approach to i18n: data-driven templates with pagination over language codes.

## How They Connect

For each language, the pipeline handles layers 1 and 2, then Eleventy handles layer 3:

| Stage | Layer | What happens |
|-------|-------|-------------|
| `prune-to-language` | 1. Source content | Filters XML to one language |
| `transform-epidoc` | 2. UI labels | Resolves `i18n:text` using `messages_xx.xml` |
| `eleventy-build` | 3. Website shell | Renders templates with language-specific data |

## In Practice

For each additional language, you need:

1. **Pipeline nodes**: prune → transform nodes per language (for HTML rendering), a shared metadata extraction node (just add the language code to its `languages` parameter), and per-language sidecar data generation and search
2. **XSLT message file**: `source/translations/messages_xx.xml` with translated UI labels
3. **Eleventy translations**: language-specific data for the website shell (menu items, page titles, etc.) (`source/website/_data/translation/xy.json`)
4. **Template updates**: templates use `permalink` pagination to generate pages per language

The [Tutorial](../tutorial/multi-language) walks through adding German to the monolingual starter project (scaffold) step by step.
