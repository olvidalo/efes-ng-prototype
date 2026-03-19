<?xml version="1.0" encoding="UTF-8"?>
<!--
    Wrapper around upstream TEI-to-HTML stylesheets that produces an HTML
    fragment with YAML front matter for Eleventy. Uses the full TEI HTML
    conversion (tables, figures, footnotes, etc.) but outputs only the
    body content — no <html>/<head>/<body> wrapper.

    Routing fields (layout, tags) are passed as XSLT parameters from
    the pipeline configuration. Title and order are extracted from the TEI.
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:efes="http://efes-ng.github.io/ns"
    xmlns="http://www.w3.org/1999/xhtml"
    exclude-result-prefixes="#all">

    <xsl:import href="../tei/profiles/default/html/to.xsl"/>

    <xsl:output method="html" html-version="5" encoding="UTF-8"
                indent="no" omit-xml-declaration="yes"/>

    <xsl:param name="layout" as="xs:string" select="''"/>
    <xsl:param name="tags" as="xs:string" select="''"/>

    <!-- Emit a YAML key-value line. Auto-quotes values containing : " # or
         leading/trailing whitespace. Returns empty sequence for empty values. -->
    <xsl:function name="efes:yaml" as="xs:string?">
        <xsl:param name="key" as="xs:string"/>
        <xsl:param name="value" as="xs:string"/>
        <xsl:if test="normalize-space($value)">
            <xsl:variable name="needs-quotes" select="
                contains($value, ':') or contains($value, '#') or
                contains($value, '&quot;') or
                matches($value, '^\s|\s$')"/>
            <xsl:variable name="safe-value" select="
                if ($needs-quotes)
                then '&quot;' || replace($value, '&quot;', '\\&quot;') || '&quot;'
                else $value"/>
            <xsl:sequence select="$key || ': ' || $safe-value || '&#10;'"/>
        </xsl:if>
    </xsl:function>

    <!-- Override root template: emit front matter, then body content only -->
    <xsl:template match="/">
        <xsl:text>---&#10;</xsl:text>
        <xsl:value-of select="
            efes:yaml('layout', $layout),
            efes:yaml('tags',   $tags),
            efes:yaml('title',  //tei:titleStmt/tei:title[1]),
            efes:yaml('order',  string(tei:TEI/@n))
        " separator=""/>
        <xsl:text>---&#10;</xsl:text>

        <!-- Body content via upstream TEI templates (no page wrapper) -->
        <xsl:for-each select="tei:TEI">
            <xsl:call-template name="simpleBody"/>
        </xsl:for-each>
    </xsl:template>

</xsl:stylesheet>
