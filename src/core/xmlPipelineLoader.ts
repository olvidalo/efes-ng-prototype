import { parseXmlDocument, Element } from 'slimdom';
import { closestMatch } from 'leven';
import fs from 'node:fs/promises';
import { Pipeline, from, files, collect, absolutePath } from './pipeline';
import { NodeRegistry } from './nodeRegistry';
import type { SchemaField } from './nodeConfigSchema';

// Import builtinNodes as side effect to register all built-in nodes
import './builtinNodes';

/**
 * Load a Pipeline from an XML pipeline configuration file.
 */
export async function loadPipelineFromXml(filePath: string): Promise<Pipeline> {
    const xml = await fs.readFile(filePath, 'utf-8');
    return parsePipelineXml(xml);
}

/**
 * Parse an XML string into a Pipeline instance.
 */
export function parsePipelineXml(xml: string): Pipeline {
    const doc = parseXmlDocument(xml);
    const root = doc.documentElement;

    if (!root || root.localName !== 'pipeline') {
        throw new Error(`Expected root element <pipeline>, got <${root?.localName}>`);
    }

    // Read pipeline attributes
    const name = requiredAttr(root, 'name');
    const buildDir = root.getAttribute('buildDir') ?? '.efes-build';
    const cacheDir = root.getAttribute('cacheDir') ?? '.efes-cache';
    const executionMode = (root.getAttribute('executionMode') ?? 'parallel') as 'sequential' | 'parallel';

    const pipeline = new Pipeline(name, buildDir, cacheDir, executionMode);

    // Pass 1: collect variables
    const variables = new Map<string, any>();
    for (const child of root.children) {
        if (child.localName === 'variable') {
            const varName = requiredAttr(child, 'name');
            variables.set(varName, parseVariableContent(child, variables));
        }
    }

    // Pass 2: parse and instantiate nodes
    for (const child of root.children) {
        if (child.localName === 'variable') continue;

        const elementName = child.localName;
        const nodeClass = NodeRegistry.get(elementName);
        if (!nodeClass) {
            const suggestion = closestMatch(elementName, NodeRegistry.elementNames(), { maxDistance: 3 });
            throw new Error(
                `Unknown node type <${elementName}>.${suggestion ? ` Did you mean <${suggestion}>?` : ''}\n` +
                `Available node types: ${NodeRegistry.elementNames().join(', ')}`
            );
        }

        const nodeName = requiredAttr(child, 'name');
        const schema = nodeClass.configSchema;
        const config: Record<string, any> = {};
        let outputConfig: Record<string, any> | undefined;

        for (const prop of child.children) {
            if (prop.localName === 'output') {
                outputConfig = parseOutputConfig(prop);
                continue;
            }

            const fieldName = prop.localName;
            const field = schema[fieldName];
            if (!field) {
                const schemaKeys = Object.keys(schema);
                const suggestion = closestMatch(fieldName, schemaKeys, { maxDistance: 3 });
                throw new Error(
                    `Error parsing <${elementName} name="${nodeName}">: ` +
                    `Unknown property "${fieldName}".${suggestion ? ` Did you mean "${suggestion}"?` : ''}\n` +
                    `Available properties: ${schemaKeys.join(', ')}`
                );
            }

            config[fieldName] = parseField(prop, field, variables, elementName, nodeName);
        }

        const nodeConfig: any = { name: nodeName, config };
        if (outputConfig) nodeConfig.outputConfig = outputConfig;

        pipeline.addNode(new nodeClass(nodeConfig));
    }

    return pipeline;
}

// --- Field parsers by schema type ---

function parseField(
    el: Element,
    field: SchemaField,
    variables: Map<string, any>,
    elementName: string,
    nodeName: string,
): any {
    switch (field.type) {
        case 'input':   return parseInput(el, variables);
        case 'scalar':  return parseScalar(el);
        case 'boolean': return parseBoolean(el, elementName, nodeName);
        case 'number':  return parseNumber(el, elementName, nodeName);
        case 'map':     return parseMap(el, variables);
        case 'array':   return parseArray(el);
        default:
            throw new Error(`Unknown schema field type "${field.type}" for property "${el.localName}" on <${elementName} name="${nodeName}">`);
    }
}

/**
 * Parse an input element. Expects exactly one child: <files>, <from>, <collect>, <absolutePath>, or <ref>.
 */
function parseInput(el: Element, variables: Map<string, any>): any {
    const child = el.children[0];
    if (!child) {
        throw new Error(`<${el.localName}> requires a child input element (<files>, <from>, <collect>, <absolutePath>, or <ref>)`);
    }

    return parseInputChild(child, variables);
}

function parseInputChild(child: Element, variables: Map<string, any>): any {
    switch (child.localName) {
        case 'files':
            return files(requiredText(child));
        case 'from': {
            const node = requiredAttr(child, 'node');
            const output = requiredAttr(child, 'output');
            const glob = (child.textContent ?? '').trim() || undefined;
            return from(node, output, glob);
        }
        case 'collect':
            return collect(requiredText(child));
        case 'absolutePath':
            return absolutePath(requiredText(child));
        case 'ref':
            return resolveRef(child, variables);
        default:
            throw new Error(`Unknown input type <${child.localName}>. Expected <files>, <from>, <collect>, <absolutePath>, or <ref>.`);
    }
}

function parseScalar(el: Element): string {
    return requiredText(el);
}

function parseBoolean(el: Element, elementName: string, nodeName: string): boolean {
    const text = requiredText(el);
    if (text === 'true') return true;
    if (text === 'false') return false;
    throw new Error(`Error parsing <${elementName} name="${nodeName}">: <${el.localName}> must be "true" or "false", got "${text}"`);
}

function parseNumber(el: Element, elementName: string, nodeName: string): number {
    const text = requiredText(el);
    const n = Number(text);
    if (isNaN(n)) {
        throw new Error(`Error parsing <${elementName} name="${nodeName}">: <${el.localName}> must be a number, got "${text}"`);
    }
    return n;
}

function parseArray(el: Element): string[] {
    return Array.from(el.children)
        .filter(child => child.localName === 'field')
        .map(child => requiredText(child));
}

/**
 * Parse a map: <param name="key">value</param> children.
 * Values can be plain text, input references, nested params, or <ref>.
 */
function parseMap(el: Element, variables: Map<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const child of el.children) {
        if (child.localName !== 'param') {
            throw new Error(`Expected <param> inside <${el.localName}>, got <${child.localName}>`);
        }
        const paramName = requiredAttr(child, 'name');

        // Check if it has child elements (input ref, nested params, or ref)
        if (child.children.length > 0) {
            const firstChild = child.children[0];
            if (firstChild.localName === 'param') {
                // Nested params — recurse
                result[paramName] = parseMap(child, variables);
            } else {
                // Input reference or ref
                result[paramName] = parseInputChild(firstChild, variables);
            }
        } else {
            // Plain text value
            result[paramName] = (child.textContent ?? '').trim();
        }
    }

    return result;
}

function parseOutputConfig(el: Element): Record<string, any> {
    const config: Record<string, any> = {};
    const to = el.getAttribute('to');
    const fromAttr = el.getAttribute('from');
    const extension = el.getAttribute('extension');
    const flat = el.getAttribute('flat');
    const filename = el.getAttribute('filename');

    if (to) config.to = to;
    if (fromAttr) config.from = fromAttr;
    if (extension) config.extension = extension;
    if (flat) config.flat = flat === 'true';
    if (filename) config.outputFilename = filename;

    return config;
}

/**
 * Parse the content of a <variable> element. Can hold any value type.
 */
function parseVariableContent(el: Element, variables: Map<string, any>): any {
    if (el.children.length === 0) {
        return requiredText(el);
    }

    const child = el.children[0];
    if (['files', 'from', 'collect', 'absolutePath', 'ref'].includes(child.localName)) {
        return parseInputChild(child, variables);
    }
    if (child.localName === 'param') {
        return parseMap(el, variables);
    }

    return requiredText(el);
}

function resolveRef(el: Element, variables: Map<string, any>): any {
    const refName = requiredAttr(el, 'name');
    if (!variables.has(refName)) {
        throw new Error(`Unknown variable reference: <ref name="${refName}">. Available variables: ${[...variables.keys()].join(', ') || '(none)'}`);
    }
    return variables.get(refName);
}

// --- Helpers ---

function requiredAttr(el: Element, attr: string): string {
    const value = el.getAttribute(attr);
    if (!value) {
        throw new Error(`<${el.localName}> requires a "${attr}" attribute`);
    }
    return value;
}

/** Get trimmed text content, throwing if empty. */
function requiredText(el: Element): string {
    const text = (el.textContent ?? '').trim();
    if (!text) {
        throw new Error(`<${el.localName}> must not be empty`);
    }
    return text;
}
