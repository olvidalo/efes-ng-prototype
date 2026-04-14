<?xml version="1.0" encoding="UTF-8"?>
<!--
    Generic XML-to-JSON converter for Eleventy .11tydata.json files.

    Reads /metadata/page/* and selects fields matching the requested
    language (via @xml:lang). Produces JSON via fn:xml-to-json().

    No domain logic — all project customisation happens upstream in extract-metadata hook.

    SSG routing params (layout, tags) are passed from the pipeline XML.
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:xs="http://www.w3.org/2001/XMLSchema">

    <xsl:output method="text"/>

    <!-- SSG routing config, passed as stylesheet parameters from the pipeline -->
    <xsl:param name="layout" as="xs:string" select="''"/>
    <xsl:param name="tags" as="xs:string" select="''"/>
    <xsl:param name="language" as="xs:string" select="'en'"/>

    <xsl:template match="/">
        <xsl:variable name="json-data" as="element(fn:map)">
            <fn:map>
                <xsl:if test="$layout != ''">
                    <fn:string key="layout"><xsl:value-of select="$layout"/></fn:string>
                </xsl:if>
                <xsl:if test="$tags != ''">
                    <fn:string key="tags"><xsl:value-of select="$tags"/></fn:string>
                </xsl:if>
                <fn:string key="documentId">
                    <xsl:value-of select="/metadata/documentId"/>
                </fn:string>
                <xsl:for-each select="/metadata/page/*[@xml:lang=$language]">
                    <xsl:choose>
                        <xsl:when test="*">
                            <!-- Has child elements (e.g. <textType><item>a</item><item>b</item></textType>) -->
                            <fn:array key="{local-name()}">
                                <xsl:for-each select="*">
                                    <fn:string><xsl:value-of select="."/></fn:string>
                                </xsl:for-each>
                            </fn:array>
                        </xsl:when>
                        <xsl:otherwise>
                            <fn:string key="{local-name()}">
                                <xsl:value-of select="."/>
                            </fn:string>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:for-each>
            </fn:map>
        </xsl:variable>
        <xsl:value-of select="fn:xml-to-json($json-data, map{'indent': true()})"/>
    </xsl:template>
</xsl:stylesheet>
