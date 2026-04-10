<?xml version="1.0" encoding="UTF-8"?>
<!--
    Generic Metadata Extraction

    Shared boilerplate for extracting XML metadata from TEI XML documents.
    Iterates over configured languages and calls project-specific hook
    templates (in indices-config.xsl) once per language via tunnel params:

    - extract-metadata: page display fields (title, sortKey, etc.)
    - extract-all-entities: dispatches to individual extraction templates
    - extract-search: search facet data as XML elements
      (multi-valued fields using <item> children are automatically deduped)

    The $language tunnel param is available to all hook templates.
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:idx="http://efes.info/indices"
    exclude-result-prefixes="tei fn xs idx">

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>
    <xsl:param name="source-file" select="base-uri()"/>
    <xsl:param name="languages" select="'en'"/>

    <!-- Extract filename without extension -->
    <xsl:variable name="filename">
        <xsl:variable name="full-name" select="tokenize($source-file, '/')[last()]"/>
        <xsl:value-of select="substring-before($full-name, '.xml')"/>
    </xsl:variable>

    <!-- Default hooks (overridden by indices-config via import precedence) -->
    <xsl:template match="tei:TEI" mode="extract-all-entities"/>
    <xsl:template match="tei:TEI" mode="extract-search"/>
    <xsl:template match="tei:TEI" mode="extract-metadata"/>

    <xsl:template match="/">
        <xsl:variable name="doc" select="."/>

        <metadata>
            <documentId><xsl:value-of select="$filename"/></documentId>
            <sourceFile><xsl:value-of select="concat($filename, '.xml')"/></sourceFile>

            <xsl:for-each select="tokenize($languages, ',')">
                <xsl:variable name="current-language" select="normalize-space(.)"/>

                <!-- Page metadata for this language -->
                <page xml:lang="{$current-language}">
                    <language><xsl:value-of select="$current-language"/></language>
                    <xsl:apply-templates select="$doc/tei:TEI" mode="extract-metadata">
                        <xsl:with-param name="language" select="$current-language" tunnel="yes"/>
                    </xsl:apply-templates>
                </page>

                <!-- Entities for this language -->
                <xsl:variable name="all-entities">
                    <xsl:apply-templates select="$doc/tei:TEI" mode="extract-all-entities">
                        <xsl:with-param name="language" select="$current-language" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:variable>

                <xsl:variable name="grouped-entities">
                    <xsl:for-each-group select="$all-entities/entity" group-by="@indexType">
                        <xsl:element name="{current-grouping-key()}">
                            <xsl:copy-of select="current-group()"/>
                        </xsl:element>
                    </xsl:for-each-group>
                </xsl:variable>

                <entities xml:lang="{$current-language}">
                    <xsl:copy-of select="$grouped-entities"/>
                </entities>

                <!-- Search fields for this language -->
                <xsl:variable name="raw-search">
                    <xsl:apply-templates select="$doc/tei:TEI" mode="extract-search">
                        <xsl:with-param name="language" select="$current-language" tunnel="yes"/>
                        <xsl:with-param name="entities" select="$grouped-entities" tunnel="yes"/>
                    </xsl:apply-templates>
                </xsl:variable>
                <search xml:lang="{$current-language}">
                    <xsl:for-each select="$raw-search/*">
                        <xsl:copy>
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
                </search>
            </xsl:for-each>
        </metadata>
    </xsl:template>
</xsl:stylesheet>
