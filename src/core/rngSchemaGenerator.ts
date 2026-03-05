import { NodeRegistry } from './nodeRegistry';
import type { SchemaField } from './nodeConfigSchema';
import './builtinNodes';

/**
 * Generate a RELAX NG (XML syntax) schema for the pipeline XML format.
 * Auto-generated from the node registry and each node's configSchema.
 */
export function generateRngSchema(): string {
    const nodeRefs = NodeRegistry.elementNames()
        .map(name => `          <ref name="${name}"/>`)
        .join('\n');

    const nodeDefinitions = NodeRegistry.elementNames()
        .map(name => {
            const entry = NodeRegistry.get(name)!;
            return generateNodeDefinition(name, entry.configSchema, entry.description);
        })
        .join('\n\n');

    const allOutputKeys = [...new Set(NodeRegistry.elementNames().flatMap(name => NodeRegistry.get(name)!.outputKeys))];
    const outputKeyValues = allOutputKeys.map(k => `            <value>${k}</value>`).join('\n');

    const outputKeyAsserts = NodeRegistry.elementNames()
        .map(name => {
            const keys = NodeRegistry.get(name)!.outputKeys;
            const valueTests = keys.map(k => `@output = '${k}'`).join(' or ');
            return `      <sch:assert test="not(/pipeline/${name}[@name = $target]) or ${valueTests}">
        Invalid output "<sch:value-of select="@output"/>" for ${name} node. Valid: ${keys.join(', ')}.
      </sch:assert>`;
        })
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0"
         xmlns:a="http://relaxng.org/ns/compatibility/annotations/1.0"
         xmlns:sch="http://purl.oclc.org/dsdl/schematron"
         datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes">

  <start>
    <ref name="pipeline"/>
  </start>

  <!-- Root element -->
  <define name="pipeline">
    <element name="pipeline">
      <attribute name="name"/>
      <optional><attribute name="buildDir"/></optional>
      <optional><attribute name="cacheDir"/></optional>
      <optional>
        <attribute name="executionMode">
          <choice>
            <value>sequential</value>
            <value>parallel</value>
          </choice>
        </attribute>
      </optional>
      <zeroOrMore>
        <choice>
          <ref name="variable"/>
${nodeRefs}
        </choice>
      </zeroOrMore>
    </element>
  </define>

  <!-- Non-empty string (at least one non-whitespace character, no normalization) -->
  <define name="nonEmptyString">
    <data type="string">
      <param name="pattern">.*\\S.*</param>
    </data>
  </define>

  <!-- Input: files, from, collect, absolute, or variable ref -->
  <define name="inputContent">
    <choice>
      <element name="files">
        <a:documentation>File path or glob pattern (e.g. "*.xml", "stylesheets/**/*.xsl"), resolved relative to the project directory.</a:documentation>
        <ref name="nonEmptyString"/>
      </element>
      <element name="from">
        <a:documentation>Use the output of another pipeline node as input. Output directory structure is preserved by default.</a:documentation>
        <attribute name="node"><data type="IDREF"/></attribute>
        <attribute name="output">
          <choice>
${outputKeyValues}
          </choice>
        </attribute>
        <text/>
      </element>
      <element name="collect">
        <a:documentation>A shared directory that multiple nodes write into. The node waits for all writers to finish before reading.</a:documentation>
        <ref name="nonEmptyString"/>
      </element>
      <element name="absolute">
        <a:documentation>Resolve a project-relative path to an absolute filesystem path. Useful for passing directory locations as XSLT parameters, e.g. for document() calls.</a:documentation>
        <ref name="nonEmptyString"/>
      </element>
      <element name="ref">
        <a:documentation>Reference a reusable value defined in a &lt;variable&gt; element.</a:documentation>
        <attribute name="name"><data type="IDREF"/></attribute>
      </element>
    </choice>
  </define>

  <!-- Output configuration -->
  <define name="outputConfig">
    <element name="output">
      <a:documentation>Configure where and how this node writes its output files.</a:documentation>
      <optional><attribute name="to"><a:documentation>Destination directory for output files.</a:documentation></attribute></optional>
      <optional><attribute name="from"><a:documentation>Source path prefix to strip when calculating output paths, preserving only the relative structure below it.</a:documentation></attribute></optional>
      <optional><attribute name="extension"><a:documentation>Replace the file extension on output files (e.g. ".html").</a:documentation></attribute></optional>
      <optional><attribute name="flat"><a:documentation>If "true", flatten all output into a single directory, ignoring subdirectory structure.</a:documentation></attribute></optional>
      <optional><attribute name="filename"><a:documentation>Write output to a single file with this name. Only for nodes that produce exactly one output file.</a:documentation></attribute></optional>
    </element>
  </define>

  <!-- Map: named params with text, input refs, or nested params -->
  <define name="mapContent">
    <zeroOrMore>
      <element name="param">
        <attribute name="name"/>
        <choice>
          <text/>
          <ref name="inputContent"/>
          <ref name="mapContent"/>
        </choice>
      </element>
    </zeroOrMore>
  </define>

  <!-- Array of string values -->
  <define name="arrayContent">
    <zeroOrMore>
      <element name="field"><ref name="nonEmptyString"/></element>
    </zeroOrMore>
  </define>

  <!-- Variable definition (reusable via <ref>) -->
  <define name="variable">
    <element name="variable">
      <a:documentation>Define a reusable value that can be referenced with &lt;ref&gt; in node configurations. Useful for shared file paths like authority files.</a:documentation>
      <attribute name="name"><data type="ID"/></attribute>
      <choice>
        <text/>
        <ref name="inputContent"/>
        <ref name="mapContent"/>
      </choice>
    </element>
  </define>

  <!-- ====== Node types ====== -->

${nodeDefinitions}

  <!-- ====== Schematron rules ====== -->
  <sch:pattern>
    <sch:rule context="ref">
      <sch:assert test="/pipeline/variable[@name = current()/@name]">
        Variable "<sch:value-of select="@name"/>" is not defined in this pipeline.
      </sch:assert>
    </sch:rule>
    <sch:rule context="from">
      <sch:assert test="/pipeline/*[not(self::variable)][@name = current()/@node]">
        Node "<sch:value-of select="@node"/>" is not defined in this pipeline.
      </sch:assert>
      <sch:let name="target" value="@node"/>
${outputKeyAsserts}
    </sch:rule>
  </sch:pattern>

</grammar>`;
}

function generateNodeDefinition(elementName: string, schema: Record<string, SchemaField>, description?: string): string {
    const entries = Object.entries(schema);
    const required = entries.filter(([, f]) => !f.optional);
    const optional = entries.filter(([, f]) => f.optional);

    const fields = [
        ...required.map(([name, field]) => fieldToRng(name, field, false)),
        ...optional.map(([name, field]) => fieldToRng(name, field, true)),
        '<optional><ref name="outputConfig"/></optional>',
    ];

    const fieldsBlock = fields.map(f => '        ' + f).join('\n');
    const doc = description ? `\n      <a:documentation>${description}</a:documentation>` : '';

    return `  <define name="${elementName}">
    <element name="${elementName}">${doc}
      <attribute name="name"><data type="ID"/></attribute>
      <interleave>
${fieldsBlock}
      </interleave>
    </element>
  </define>`;
}

function fieldToRng(fieldName: string, field: SchemaField, isOptional: boolean): string {
    const content = fieldContentRng(field.type);
    const doc = field.description ? `<a:documentation>${field.description}</a:documentation>` : '';
    const element = `<element name="${fieldName}">${doc}${content}</element>`;
    return isOptional ? `<optional>${element}</optional>` : element;
}

function fieldContentRng(type: SchemaField['type']): string {
    switch (type) {
        case 'input':   return '<ref name="inputContent"/>';
        case 'scalar':  return '<ref name="nonEmptyString"/>';
        case 'number':  return '<ref name="nonEmptyString"/>';
        case 'boolean': return '<choice><value>true</value><value>false</value></choice>';
        case 'map':     return '<ref name="mapContent"/>';
        case 'array':   return '<ref name="arrayContent"/>';
        default:        return '<text/>';
    }
}
