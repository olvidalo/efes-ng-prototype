<?xml version="1.0" encoding="UTF-8"?>
<!--
    Project-specific XSLT overrides for IRCyr.

    This file demonstrates how to override EpiDoc stylesheet templates
    without modifying the EpiDoc stylesheets themselves (referred to as
    "upstream" — the shared, externally maintained code). It is imported by
    epidoc-to-html.xsl after the upstream stylesheets, so templates
    here take precedence by XSLT import priority.

    Use this pattern when:
    - The upstream stylesheets produce output that doesn't match your
      project's needs (e.g. different HTML structure, missing features)
    - Your project's data uses conventions that the upstream doesn't
      support (e.g. different authority file formats)
    - You want to keep the upstream stylesheets unmodified so they can
      be updated independently

    Each override below includes a comment explaining what it changes
    and why, with a reference to the upstream template it replaces.
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:t="http://www.tei-c.org/ns/1.0"
    exclude-result-prefixes="t">

    <!-- ═══════════════════════════════════════════════════════════════
         Override 1: Bibliography citation rendering

         Problem: The upstream htm-teilistbiblandbibl.xsl wraps
         t:listBibl//t:bibl in <li> elements. When the bibliography
         section uses apply-templates on entries from the authority
         file (whose <bibl> elements live inside <listBibl>), each
         citation gets wrapped in <li> — rendering as a bulleted list
         instead of inline text.

         The original EFES avoided this because its htm-teibibl.xsl
         used xsl:value-of (text extraction only). The upstream later
         changed to xsl:apply-templates, which triggers the <li>
         wrapping unintentionally.

         Fix: Override the template to render content inline without
         list markup.

         Upstream: htm-teilistbiblandbibl.xsl, match="t:listBibl//t:bibl"
         ═══════════════════════════════════════════════════════════════ -->

    <xsl:template match="t:listBibl//t:bibl">
        <xsl:apply-templates/>
    </xsl:template>


    <!-- ═══════════════════════════════════════════════════════════════
         Override 2: Symbol display from authority file

         Problem: IRCyr inscriptions reference symbols via
         <g ref="symbols.xml#crux"/>. The project's symbols.xml uses
         TEI charProp/localName/value format for glyph definitions:

           <glyph xml:id="crux">
             <charProp>
               <localName>glyph-display</localName>
               <value>†</value>
             </charProp>
             <charProp>
               <localName>text-display</localName>
               <value>crux</value>
             </charProp>
           </glyph>

         The upstream EpiDoc stylesheets only support charDecl.xml with
         the <mapping> format. The inslib-specific symbol handling that
         existed in the ircyr-efes fork was never included upstream.

         Fix: Match t:g elements with external file references (not
         starting with #), resolve the symbol from the authority file,
         and render using the appropriate display value. Wrapping logic
         (diplomatic: <em><span>, interpretive: double parens) is
         replicated from htm-teig.xsl since our override replaces the
         full t:g template chain.

         Upstream: teig.xsl (t:g template) + htm-teig.xsl (wrapping)
         Adapted from: https://github.com/kingsdigitallab/ircyr-efes/
           commit/5aebb85ececc9327c456c2c3f6078211862d6224
         ═══════════════════════════════════════════════════════════════ -->

    <xsl:template match="t:g[@ref and not(starts-with(@ref,'#'))]">
        <xsl:param name="parm-edition-type" tunnel="yes" required="no"/>
        <xsl:param name="parm-authority-dir" tunnel="yes" required="no"/>

        <xsl:variable name="symbol" select="substring-after(@ref,'#')"/>
        <xsl:variable name="ref-file" select="substring-before(@ref, '#')"/>
        <xsl:variable name="authority-path" select="
            if ($parm-authority-dir and doc-available(concat($parm-authority-dir, $ref-file)))
            then concat($parm-authority-dir, $ref-file)
            else $ref-file"/>

        <xsl:choose>
            <xsl:when test="doc-available($authority-path)">
                <xsl:variable name="symbol-id" select="document($authority-path)//t:glyph[@xml:id=$symbol]"/>
                <xsl:variable name="display-value">
                    <xsl:choose>
                        <xsl:when test="$symbol-id//t:charProp[t:localName='glyph-display'][t:value[text()]] and $parm-edition-type='diplomatic'">
                            <xsl:value-of select="$symbol-id//t:charProp[t:localName='glyph-display']/t:value"/>
                        </xsl:when>
                        <xsl:when test="$symbol-id//t:charProp[t:localName='text-display'][t:value[text()]]">
                            <xsl:value-of select="$symbol-id//t:charProp[t:localName='text-display']/t:value"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="@ref"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>

                <!-- Wrapping logic from htm-teig.xsl -->
                <xsl:choose>
                    <xsl:when test="$parm-edition-type='diplomatic'">
                        <xsl:text> </xsl:text>
                        <em><span class="smaller"><xsl:value-of select="$display-value"/></span></em>
                        <xsl:text> </xsl:text>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text>((</xsl:text>
                        <xsl:value-of select="$display-value"/>
                        <xsl:text>))</xsl:text>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:when>
            <xsl:otherwise>
                <!-- Authority file not found — fall back to upstream handling -->
                <xsl:next-match/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>
