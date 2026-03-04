/**
 * Shared utilities for parsing XML metadata files produced by the
 * extract-metadata XSLT stylesheet.
 *
 * Uses Saxon-JS getResource + XPath.evaluate for consistent XML parsing
 * across all aggregation and data-generation nodes.
 */
// @ts-ignore
import { getResource, XPath } from 'saxonjs-he';
import fs from 'node:fs/promises';

/**
 * Parse an XML metadata file and return the Saxon-JS document node.
 */
export async function parseMetadataXml(filePath: string): Promise<any> {
    const text = await fs.readFile(filePath, 'utf-8');
    return getResource({ text, type: 'xml' });
}

/**
 * Evaluate an XPath expression on a document, returning a string.
 */
export function xpathString(doc: any, expr: string): string {
    return XPath.evaluate(expr, doc, { resultForm: 'value' }) || '';
}

/**
 * Evaluate an XPath expression on a document, returning an array of nodes.
 */
export function xpathNodes(doc: any, expr: string): any[] {
    return XPath.evaluate(expr, doc, { resultForm: 'array' }) || [];
}

/**
 * Convert an XML element's child elements to a JSON-compatible value.
 *
 * Rules:
 * - If the element has <item> children, it becomes an array of their text values
 * - Otherwise, it becomes the text content of the element
 */
export function elementToJsonValue(el: any): string | string[] {
    const items = XPath.evaluate('item', el, { resultForm: 'array' }) || [];
    if (items.length > 0) {
        return items.map((item: any) =>
            XPath.evaluate('string(.)', item, { resultForm: 'value' }) || ''
        );
    }
    return XPath.evaluate('string(.)', el, { resultForm: 'value' }) || '';
}

/**
 * Convert the children of an XML element into a flat JSON object.
 * Useful for converting <metadata> children (excluding specific elements) into a key-value map.
 *
 * @param parentNode The parent XML element
 * @param excludeNames Element names to skip
 */
export function childElementsToJson(
    parentNode: any,
    excludeNames: string[] = []
): Record<string, any> {
    const result: Record<string, any> = {};
    const children = XPath.evaluate('*', parentNode, { resultForm: 'array' }) || [];

    for (const child of children) {
        const name = XPath.evaluate('local-name(.)', child, { resultForm: 'value' });
        if (excludeNames.includes(name)) continue;
        result[name] = elementToJsonValue(child);
    }

    return result;
}
