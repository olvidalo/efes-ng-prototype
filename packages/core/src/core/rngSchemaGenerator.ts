import { nodeRegistry } from './nodeRegistry';
import type { SchemaField } from './nodeConfigSchema';
import './builtinNodes';

/**
 * Generate a RELAX NG (XML syntax) schema for the pipeline XML format.
 * Auto-generated from the node registry and each node's configSchema.
 */
export function generateRngSchema(): string {
    const entries = nodeRegistry.all();

    const nodeRefs = entries
        .map(([name]) => `          <ref name="${name}"/>`)
        .join('\n');

    const nodeDefinitions = entries
        .map(([name, node]) => generateNodeDefinition(name, node.configSchema, node.description))
        .join('\n\n');

    const allOutputKeys = [...new Set(entries.flatMap(([, node]) => [...node.outputKeys]))];
    const outputKeyValues = allOutputKeys.map(k => `            <value>${k}</value>`).join('\n');

    const outputKeyAsserts = entries
        .map(([name, node]) => {
            const valueTests = node.outputKeys.map(k => `@output = '${k}'`).join(' or ');
            return `      <sch:assert test="not(/p:pipeline/p:${name}[@name = $target]) or ${valueTests}">
        Invalid output "<sch:value-of select="@output"/>" for ${name} node. Valid: ${[...node.outputKeys].join(', ')}.
      </sch:assert>`;
        })
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0"
         xmlns:a="http://relaxng.org/ns/compatibility/annotations/1.0"
         xmlns:sch="http://purl.oclc.org/dsdl/schematron"
         ns="urn:efes-ng:pipeline"
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
      <optional><ref name="meta"/></optional>
      <zeroOrMore>
        <choice>
          <ref name="variable"/>
${nodeRefs}
        </choice>
      </zeroOrMore>
    </element>
  </define>

  <!-- Pipeline metadata: project-level settings consumed by CLI, GUI, etc. -->
  <define name="meta">
    <element name="meta">
      <a:documentation>Project-level metadata not used by the pipeline itself. Consumed by CLI, GUI, and other tools (e.g. siteDir for the dev server).</a:documentation>
      <optional>
        <attribute name="siteDir">
          <a:documentation>Directory where the final site is generated. Used by the dev server for live preview and the CLI for status checks.</a:documentation>
        </attribute>
      </optional>
      <zeroOrMore>
        <attribute>
          <anyName>
            <except><name>siteDir</name></except>
          </anyName>
        </attribute>
      </zeroOrMore>
    </element>
  </define>

  <!-- Non-empty string (at least one non-whitespace character, no normalization) -->
  <define name="nonEmptyString">
    <data type="string">
      <param name="pattern">.*\\S.*</param>
    </data>
  </define>

  <!-- Input: files, from, collect, absolutePath, or variable ref -->
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
      <element name="absolutePath">
        <a:documentation>Resolve a project-relative path to an absolute filesystem path. Useful for passing directory locations as XSLT parameters, e.g. for document() calls. For file references, prefer &lt;files&gt; which also tracks the file for cache invalidation.</a:documentation>
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
      <optional><attribute name="stripPrefix"><a:documentation>Strip this prefix from input paths to derive the output subpath, preserving only the relative structure below it.</a:documentation></attribute></optional>
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

  <!-- ====== Index configuration elements (urn:efes-ng:indices) ====== -->
  <!-- Used in metadata-config.xsl to define index structure and labels -->

  <define name="idx-index">
    <element name="index" ns="urn:efes-ng:indices">
      <a:documentation>Define an index type with its title, description, and column structure.</a:documentation>
      <attribute name="id"><data type="NCName"/></attribute>
      <optional><attribute name="order"><data type="integer"/></attribute></optional>
      <optional>
        <attribute name="nav">
          <a:documentation>Navigation group for this index. Use "indices" (default) for the indices dropdown, or a custom value like "bibliography" to exclude from the dropdown.</a:documentation>
        </attribute>
      </optional>
      <oneOrMore><ref name="idx-title"/></oneOrMore>
      <zeroOrMore><ref name="idx-description"/></zeroOrMore>
      <optional><ref name="idx-columns"/></optional>
      <optional><ref name="idx-notes"/></optional>
      <optional><ref name="idx-groupBy"/></optional>
    </element>
  </define>

  <define name="idx-title">
    <element name="title" ns="urn:efes-ng:indices">
      <a:documentation>Display title for the index. Add xml:lang for translations.</a:documentation>
      <optional><attribute name="xml:lang"/></optional>
      <text/>
    </element>
  </define>

  <define name="idx-description">
    <element name="description" ns="urn:efes-ng:indices">
      <a:documentation>Description text shown on the index page. Add xml:lang for translations.</a:documentation>
      <optional><attribute name="xml:lang"/></optional>
      <text/>
    </element>
  </define>

  <define name="idx-columns">
    <element name="columns" ns="urn:efes-ng:indices">
      <oneOrMore><ref name="idx-column"/></oneOrMore>
    </element>
  </define>

  <define name="idx-column">
    <element name="column" ns="urn:efes-ng:indices">
      <a:documentation>Define a column in the index table. The key must match a field name output by the extraction template.</a:documentation>
      <attribute name="key"><data type="NCName"/></attribute>
      <optional>
        <attribute name="type">
          <choice>
            <value>references</value>
            <value>link</value>
          </choice>
        </attribute>
      </optional>
      <oneOrMore><ref name="idx-label"/></oneOrMore>
    </element>
  </define>

  <define name="idx-label">
    <element name="label" ns="urn:efes-ng:indices">
      <a:documentation>Display label for a column header. Add xml:lang for translations.</a:documentation>
      <optional><attribute name="xml:lang"/></optional>
      <text/>
    </element>
  </define>

  <define name="idx-notes">
    <element name="notes" ns="urn:efes-ng:indices">
      <oneOrMore>
        <element name="p" ns="urn:efes-ng:indices"><text/></element>
      </oneOrMore>
    </element>
  </define>

  <define name="idx-groupBy">
    <element name="groupBy" ns="urn:efes-ng:indices">
      <a:documentation>Group index entries by a field value, rendering separate tables per group.</a:documentation>
      <attribute name="field"><data type="NCName"/></attribute>
      <oneOrMore>
        <element name="group" ns="urn:efes-ng:indices">
          <attribute name="value"/>
          <attribute name="label"/>
        </element>
      </oneOrMore>
    </element>
  </define>

  <!-- ====== Schematron rules ====== -->
  <sch:ns prefix="p" uri="urn:efes-ng:pipeline"/>
  <sch:pattern>
    <sch:rule context="p:ref">
      <sch:assert test="/p:pipeline/p:variable[@name = current()/@name]">
        Variable "<sch:value-of select="@name"/>" is not defined in this pipeline.
      </sch:assert>
    </sch:rule>
    <sch:rule context="p:from">
      <sch:assert test="/p:pipeline/*[not(self::p:variable)][@name = current()/@node]">
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
