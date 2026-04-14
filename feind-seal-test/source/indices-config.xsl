<?xml version="1.0" encoding="UTF-8"?>
<!--
    Index configuration for Feind Seal Test.

    This stylesheet defines page metadata and indices to extract from your
    EpiDoc/TEI XML documents. It imports the generic extract-metadata.xsl
    library and provides project-specific extraction logic.
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:idx="http://efes.info/indices"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="#all">

    <xsl:import href="stylesheets/lib/extract-metadata.xsl"/>

    <xsl:param name="geography-file" as="xs:string"/>
    <xsl:variable name="geography" select="document('file://' || $geography-file)"/>

    <!-- ═══════════════════════════════════════════════
         PAGE METADATA
         Fields used for page display, sorting, and the
         document list. Customize these to match your
         TEI encoding.
         ═══════════════════════════════════════════════ -->

    <xsl:template match="tei:TEI" mode="extract-metadata">
        <xsl:param name="language" tunnel="yes"/>
        <!-- Title: language-specific <title>, falls back to first title, then filename -->
        <xsl:variable name="tei-title" select="normalize-space(
            (//tei:titleStmt/tei:title[@xml:lang=$language], //tei:titleStmt/tei:title)[1]
        )"/>
        <title>
            <xsl:choose>
                <xsl:when test="string-length($tei-title) > 0">
                    <xsl:value-of select="$tei-title"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$filename"/>
                </xsl:otherwise>
            </xsl:choose>
        </title>

        <!-- Sort key: splits filename on letter/number boundaries, zero-pads numbers -->
        <sortKey>
            <xsl:analyze-string select="$filename" regex="([a-zA-Z]+)|([0-9]+)">
                <xsl:matching-substring>
                    <xsl:choose>
                        <xsl:when test="regex-group(2)">
                            <xsl:value-of select="format-number(xs:integer(regex-group(2)), '00000')"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="regex-group(1)"/>
                        </xsl:otherwise>
                    </xsl:choose>
                    <xsl:text>.</xsl:text>
                </xsl:matching-substring>
            </xsl:analyze-string>
        </sortKey>

        <origDate><xsl:value-of select="normalize-space(
            (//tei:origDate/tei:seg[@xml:lang=$language], //tei:origDate)[1]
        )"/></origDate>
        <category><xsl:value-of select="normalize-space(
            (//tei:msContents/tei:summary[@n='whole']/tei:seg[@xml:lang=$language],
             //tei:msContents/tei:summary[@n='whole'])[1]
        )"/></category>
    </xsl:template>

    <!-- ═══════════════════════════════════════════════
         INDEX DEFINITIONS
         Add your project's indices below.
         ═══════════════════════════════════════════════ -->

    <!--
    Example index definition:

    <idx:index id="persons" title="Persons" nav="indices" order="10">
        <idx:column key="name">Name</idx:column>
        <idx:column key="references" type="references">References</idx:column>
    </idx:index>
    -->

    <idx:index id="persons" title="Persons" nav="indices" order="10">
        <idx:description>Persons attested in the collection.</idx:description>
        <idx:columns>
            <idx:column key="forename">Forename</idx:column>
            <idx:column key="surname">Surname</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

    <!-- Adapted for SigiDoc seal issuers -->
    <xsl:template match="tei:TEI" mode="extract-persons">
        <xsl:param name="language" tunnel="yes"/>
        <xsl:for-each select=".//tei:listPerson[@type='issuer']/tei:person">
            <xsl:variable name="name" select="(tei:persName[@xml:lang=$language], tei:persName)[1]"/>
            <xsl:variable name="forename" select="normalize-space($name/tei:forename)"/>
            <xsl:variable name="surname" select="normalize-space($name/tei:surname)"/>
            <xsl:if test="$forename or $surname">
                <entity indexType="persons">
                    <forename><xsl:value-of select="$forename"/></forename>
                    <surname><xsl:value-of select="$surname"/></surname>
                    <sortKey><xsl:value-of select="lower-case(string-join(($forename, $surname), ' '))"/></sortKey>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <idx:index id="places" title="Place Names" nav="indices" order="20">
        <idx:description>Place names attested on seals.</idx:description>
        <idx:columns>
            <idx:column key="name">Name</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>
    <xsl:template match="tei:TEI" mode="extract-places">
        <xsl:param name="language" tunnel="yes"/>
        <xsl:for-each select=".//tei:div[@type='textpart']//tei:placeName[starts-with(@ref, '#geo')]">
            <xsl:variable name="geo-id" select="substring-after(@ref, '#')"/>
            <xsl:variable name="place" select="$geography//tei:place[@xml:id = $geo-id]"/>
            <xsl:variable name="displayName" select="normalize-space(
            ($place/tei:placeName[@xml:lang=$language],
             $place/tei:placeName[@xml:lang='en'],
             $place/tei:placeName)[1]
        )"/>
            <xsl:if test="string-length($displayName) > 0">
                <entity indexType="places">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="lower-case($displayName)"/></sortKey>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ═══════════════════════════════════════════════
         EXTRACTION TEMPLATES
         Implement extract-{id} templates for each index.
         ═══════════════════════════════════════════════ -->

    <xsl:template match="tei:TEI" mode="extract-all-entities">
        <xsl:param name="language" tunnel="yes"/>
        <xsl:apply-templates select="." mode="extract-persons"/>
        <xsl:apply-templates select="." mode="extract-places"/>
    </xsl:template>

    <!-- ═══════════════════════════════════════════════
         SEARCH FIELDS
         ═══════════════════════════════════════════════ -->

    <xsl:template match="tei:TEI" mode="extract-search">
        <xsl:param name="language" tunnel="yes"/>
        <xsl:variable name="tei-title" select="normalize-space(
            (//tei:titleStmt/tei:title[@xml:lang=$language], //tei:titleStmt/tei:title)[1]
        )"/>
        <title><xsl:value-of select="if (string-length($tei-title) > 0)
            then $tei-title else $filename"/></title>
        <origDate><xsl:value-of select="normalize-space(
            (//tei:origDate/tei:seg[@xml:lang=$language], //tei:origDate)[1]
        )"/></origDate>
        <material><xsl:value-of select="normalize-space(
            (//tei:material/tei:seg[@xml:lang=$language], //tei:material)[1]
        )"/></material>
        <milieu>
            <xsl:for-each select="//tei:listPerson[@type='issuer']/tei:person/@role">
                <xsl:for-each select="tokenize(normalize-space(.), ' ')">
                    <item><xsl:value-of select="translate(., '-', ' ')"/></item>
                </xsl:for-each>
            </xsl:for-each>
        </milieu>
        <fullText><xsl:value-of select="normalize-space(string-join(
            //tei:div[@type='edition']//text(), ' '))"/></fullText>
    </xsl:template>

</xsl:stylesheet>
