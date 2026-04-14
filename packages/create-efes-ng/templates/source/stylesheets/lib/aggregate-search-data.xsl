<?xml version="1.0" encoding="UTF-8"?>
<!--
    Search Data Aggregation

    Reads per-document metadata XML files and produces a JSON array
    of search documents for a single language. Each document contains
    fields from the <search> section matching the requested language
    (via @xml:lang) plus the documentId.

    For multi-language, run one pipeline node per language with a
    different $language parameter and output filename.

    The output is consumed by the client-side search component, which builds
    a FlexSearch index and computes facet counts at load time.

    Parameters:
    - metadata-files: space-separated list of absolute paths to metadata XML files
    - language: which language's search data to extract (default: first available)
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    exclude-result-prefixes="xs fn">

    <xsl:output method="text" encoding="UTF-8"/>

    <!-- Space-separated list of absolute paths to metadata XML files -->
    <xsl:param name="metadata-files" as="xs:string*"/>
    <xsl:param name="language" as="xs:string" select="''"/>

    <!-- Load all metadata documents -->
    <xsl:variable name="all-docs" select="for $f in $metadata-files return doc('file://' || $f)"/>

    <!-- Resolve language: explicit param, or first available in metadata -->
    <xsl:variable name="resolved-language" select="
        if ($language != '') then $language
        else string(($all-docs/metadata/search/*/@xml:lang)[1])
    "/>

    <xsl:template name="aggregate" match="/">
        <xsl:variable name="json" as="element(fn:array)">
            <fn:array>
                <xsl:for-each select="$all-docs">
                    <xsl:sort select="string(/metadata/documentId)"/>
                    <xsl:variable name="doc-id" select="string(/metadata/documentId)"/>
                    <xsl:variable name="search" select="/metadata/search"/>

                    <xsl:if test="$search">
                        <fn:map>
                            <fn:string key="documentId"><xsl:value-of select="$doc-id"/></fn:string>

                            <xsl:for-each select="$search/*[@xml:lang=$resolved-language]">
                                <xsl:variable name="field-name" select="local-name()"/>
                                <xsl:choose>
                                    <!-- Multi-valued field (has <item> children) → JSON array -->
                                    <xsl:when test="item">
                                        <fn:array key="{$field-name}">
                                            <xsl:for-each select="item[normalize-space()]">
                                                <fn:string><xsl:value-of select="normalize-space(.)"/></fn:string>
                                            </xsl:for-each>
                                        </fn:array>
                                    </xsl:when>
                                    <!-- Scalar field → JSON string -->
                                    <xsl:otherwise>
                                        <fn:string key="{$field-name}"><xsl:value-of select="normalize-space(.)"/></fn:string>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </xsl:for-each>
                        </fn:map>
                    </xsl:if>
                </xsl:for-each>
            </fn:array>
        </xsl:variable>

        <xsl:value-of select="fn:xml-to-json($json)"/>
    </xsl:template>

</xsl:stylesheet>
