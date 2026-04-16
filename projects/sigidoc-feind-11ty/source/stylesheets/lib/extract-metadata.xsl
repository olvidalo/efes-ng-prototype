<?xml version="1.0" encoding="UTF-8"?>
<!--
    Generic Metadata Extraction

    Shared boilerplate for extracting XML metadata from TEI XML documents.
    Iterates over configured languages and calls project-specific hook
    templates (in metadata-config.xsl) once per language:

    - extract-metadata: page display fields (title, sortKey, etc.)
    - extract-all-entities: dispatches to individual extraction templates
    - extract-search: search facet data as XML elements
      (multi-valued fields using <item> children are automatically deduped)

    The framework auto-stamps xml:lang on all output elements and merges
    entities with the same xml:id into unified elements.

    The $language tunnel param is available to all hook templates.
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:idx="urn:efes-ng:indices"
    exclude-result-prefixes="tei fn xs idx">

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>
    <xsl:param name="source-file" select="base-uri()"/>
    <xsl:param name="languages" select="'en'"/>

    <!-- Extract filename without extension -->
    <xsl:variable name="filename">
        <xsl:variable name="full-name" select="tokenize($source-file, '/')[last()]"/>
        <xsl:value-of select="substring-before($full-name, '.xml')"/>
    </xsl:variable>

    <!-- Default hooks (overridden by metadata-config via import precedence) -->
    <xsl:template match="tei:TEI" mode="extract-all-entities"/>
    <xsl:template match="tei:TEI" mode="extract-search"/>
    <xsl:template match="tei:TEI" mode="extract-metadata"/>

    <xsl:template match="/">
        <xsl:variable name="doc" select="."/>

        <metadata>
            <documentId><xsl:value-of select="$filename"/></documentId>
            <sourceFile><xsl:value-of select="concat($filename, '.xml')"/></sourceFile>

            <!-- Page metadata: call hook per language, auto-stamp xml:lang -->
            <page>
                <xsl:for-each select="tokenize($languages)">
                    <xsl:variable name="lang" select="."/>
                    <xsl:variable name="hook-output">
                        <xsl:apply-templates select="$doc/tei:TEI" mode="extract-metadata">
                            <xsl:with-param name="language" select="$lang" tunnel="yes"/>
                        </xsl:apply-templates>
                    </xsl:variable>
                    <xsl:for-each select="$hook-output/*">
                        <xsl:copy>
                            <xsl:copy-of select="@*"/>
                            <xsl:attribute name="xml:lang" select="$lang"/>
                            <xsl:copy-of select="node()"/>
                        </xsl:copy>
                    </xsl:for-each>
                </xsl:for-each>
            </page>

            <!-- Entities: call hook per language, tag with position,
                 then merge across languages by xml:id or position -->
            <xsl:variable name="all-entities-raw" as="element()*">
                <xsl:for-each select="tokenize($languages)">
                    <xsl:variable name="lang" select="."/>
                    <xsl:variable name="hook-output">
                        <xsl:apply-templates select="$doc/tei:TEI" mode="extract-all-entities">
                            <xsl:with-param name="language" select="$lang" tunnel="yes"/>
                        </xsl:apply-templates>
                    </xsl:variable>
                    <xsl:for-each-group select="$hook-output/entity" group-by="string(@indexType)">
                        <xsl:for-each select="current-group()">
                            <entity>
                                <xsl:copy-of select="@*"/>
                                <xsl:attribute name="xml:lang" select="$lang"/>
                                <xsl:attribute name="_pos" select="position()"/>
                                <xsl:copy-of select="*"/>
                            </entity>
                        </xsl:for-each>
                    </xsl:for-each-group>
                </xsl:for-each>
            </xsl:variable>

            <entities>
                <!-- Group by indexType, then merge by xml:id (or position fallback) -->
                <xsl:for-each-group select="$all-entities-raw" group-by="@indexType">
                    <xsl:element name="{current-grouping-key()}">
                        <xsl:for-each-group select="current-group()"
                            group-by="if (@xml:id) then string(@xml:id) else string(@_pos)">
                            <entity>
                                <!-- Copy attributes except xml:lang and _pos -->
                                <xsl:copy-of select="current-group()[1]/@*[local-name() != '_pos']
                                    [not(local-name() = 'lang' and namespace-uri() = 'http://www.w3.org/XML/1998/namespace')]"/>
                                <!-- Move xml:lang from entity to children -->
                                <xsl:for-each select="current-group()">
                                    <xsl:variable name="entity-lang" select="string(@xml:lang)"/>
                                    <xsl:for-each select="*">
                                        <xsl:copy>
                                            <xsl:copy-of select="@*"/>
                                            <xsl:attribute name="xml:lang" select="$entity-lang"/>
                                            <xsl:copy-of select="node()"/>
                                        </xsl:copy>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </entity>
                        </xsl:for-each-group>
                    </xsl:element>
                </xsl:for-each-group>
            </entities>

            <!-- Search fields: call hook per language, auto-stamp xml:lang, dedup items -->
            <search>
                <xsl:for-each select="tokenize($languages)">
                    <xsl:variable name="lang" select="."/>
                    <xsl:variable name="hook-output">
                        <xsl:apply-templates select="$doc/tei:TEI" mode="extract-search">
                            <xsl:with-param name="language" select="$lang" tunnel="yes"/>
                        </xsl:apply-templates>
                    </xsl:variable>
                    <xsl:for-each select="$hook-output/*">
                        <xsl:copy>
                            <xsl:copy-of select="@*"/>
                            <xsl:attribute name="xml:lang" select="$lang"/>
                            <xsl:choose>
                                <xsl:when test="item">
                                    <xsl:for-each-group select="item" group-by="normalize-space(.)">
                                        <item><xsl:value-of select="current-grouping-key()"/></item>
                                    </xsl:for-each-group>
                                </xsl:when>
                                <xsl:otherwise>
                                    <xsl:copy-of select="node()"/>
                                </xsl:otherwise>
                            </xsl:choose>
                        </xsl:copy>
                    </xsl:for-each>
                </xsl:for-each>
            </search>
        </metadata>
    </xsl:template>
</xsl:stylesheet>
