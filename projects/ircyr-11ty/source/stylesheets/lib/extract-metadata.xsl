<?xml version="1.0" encoding="UTF-8"?>
<!--
    Generic Metadata Extraction

    Shared boilerplate for extracting XML metadata from TEI XML documents.
    Project-specific logic is provided via four hook template modes,
    implemented in each project's indices-config.xsl:

    - extract-all-entities: dispatches to individual extraction templates
    - extract-search: returns search facet data as XML elements
      (multi-valued fields using <item> children are automatically deduped)
    - extract-metadata: returns additional project-specific page display fields
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
    <xsl:param name="language" select="'en'"/>

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
        <!-- Collect ALL entity elements via dispatch hook -->
        <xsl:variable name="all-entities">
            <xsl:apply-templates select="/tei:TEI" mode="extract-all-entities"/>
        </xsl:variable>

        <!-- Group entities by indexType into named wrapper elements -->
        <xsl:variable name="grouped-entities">
            <xsl:for-each-group select="$all-entities/entity" group-by="@indexType">
                <xsl:element name="{current-grouping-key()}">
                    <xsl:copy-of select="current-group()"/>
                </xsl:element>
            </xsl:for-each-group>
        </xsl:variable>

        <metadata>
            <documentId><xsl:value-of select="$filename"/></documentId>

            <page>
                <language><xsl:value-of select="$language"/></language>
                <sourceFile><xsl:value-of select="concat($filename, '.xml')"/></sourceFile>

                <!-- Project-specific page fields (title, sortKey, origDate, etc.) -->
                <xsl:apply-templates select="/tei:TEI" mode="extract-metadata"/>
            </page>

            <entities>
                <xsl:copy-of select="$grouped-entities"/>
            </entities>

            <!-- Dedup multi-valued search fields (elements with <item> children) -->
            <xsl:variable name="raw-search">
                <xsl:apply-templates select="/tei:TEI" mode="extract-search">
                    <xsl:with-param name="entities" select="$grouped-entities" tunnel="yes"/>
                </xsl:apply-templates>
            </xsl:variable>
            <search>
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
        </metadata>
    </xsl:template>
</xsl:stylesheet>
