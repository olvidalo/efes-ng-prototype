<?xml version="1.0" encoding="UTF-8"?>
<!--
    Entity Indices Configuration for SigiDoc FEIND

    This file contains both:
    1. Index metadata (in idx: namespace) - title, columns, notes
    2. Extraction templates (xsl:template) - XPath logic for each index type

    To add a new index:
    1. Add an <idx:index> element with metadata
    2. Add an <xsl:template mode="extract-{id}"> with extraction logic
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:idx="http://efes.info/indices"
    exclude-result-prefixes="xs">

    <xsl:import href="lib/extract-metadata.xsl"/>

    <!-- ================================================================== -->
    <!-- INDEX: persons (Prosopography)                                      -->
    <!-- ================================================================== -->
    <idx:index id="persons" title="Persons" order="1">
        <idx:description>Prosopography of seal issuers.</idx:description>
        <idx:columns>
            <idx:column key="name">Name</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

    <xsl:template match="tei:TEI" mode="extract-persons">
        <xsl:for-each select=".//tei:listPerson[@type='issuer']/tei:person">
            <xsl:variable name="en-name" select="tei:persName[@xml:lang='en']"/>
            <xsl:variable name="forename" select="normalize-space($en-name/tei:forename)"/>
            <xsl:variable name="surname" select="normalize-space($en-name/tei:surname)"/>
            <xsl:variable name="displayName" select="normalize-space(
                string-join(($forename, $surname[string-length(.) > 0]), ' ')
            )"/>
            <xsl:if test="string-length($displayName) > 0">
                <entity indexType="persons">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="lower-case($displayName)"/></sortKey>
                    <collectionName><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:rs[@type='collection-name'][@xml:lang='en'])"/></collectionName>
                    <invNr><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:idno[@type='inv-nr-current'][normalize-space()][1])"/></invNr>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: places (Place Names)                                         -->
    <!-- ================================================================== -->
    <idx:index id="places" title="Place Names" order="2">
        <idx:description>Place names attested on seals.</idx:description>
        <idx:columns>
            <idx:column key="name">Name</idx:column>
            <idx:column key="pleiades" type="link" labelKey="pleiadesId">Pleiades</idx:column>
            <idx:column key="geonames" type="link" labelKey="geonamesId">Geonames</idx:column>
            <idx:column key="tib" type="link" labelKey="tibId">TIB</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

    <!-- ================================================================== -->
    <!-- INDEX: dignities (Dignities)                                       -->
    <!-- ================================================================== -->
    <idx:index id="dignities" title="Dignities" order="3">
        <idx:description>Dignities and titles attested on seals.</idx:description>
        <idx:columns>
            <idx:column key="name">Dignity</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

    <!-- ================================================================== -->
    <!-- INDEX: offices (Offices)                                           -->
    <!-- ================================================================== -->
    <idx:index id="offices" title="Offices" order="4">
        <idx:description>Offices attested on seals.</idx:description>
        <idx:columns>
            <idx:column key="name">Office</idx:column>
            <idx:column key="officeType">Type</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

    <!-- ================================================================== -->
    <!-- INDEX: invocations (Invocations)                                   -->
    <!-- ================================================================== -->
    <idx:index id="invocations" title="Invocations" order="5">
        <idx:description>Invocations attested on seals.</idx:description>
        <idx:columns>
            <idx:column key="name">Invocation</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

    <!-- Language code → display label mapping (used by extract-search) -->
    <xsl:variable name="language-labels" as="element()*">
        <label code="grc">Ancient Greek</label>
        <label code="la">Latin</label>
        <label code="grc-Latn">Transliterated Greek</label>
    </xsl:variable>

    <!-- Authority file paths – passed as stylesheet parameters (absolute paths) -->
    <xsl:param name="geography-file" as="xs:string" select="''"/>
    <xsl:variable name="geography" select="if ($geography-file != '') then document('file://' || $geography-file) else ()"/>
    <xsl:param name="dignities-file" as="xs:string" select="''"/>
    <xsl:variable name="dignities" select="if ($dignities-file != '') then document('file://' || $dignities-file) else ()"/>
    <xsl:param name="offices-file" as="xs:string" select="''"/>
    <xsl:variable name="offices" select="if ($offices-file != '') then document('file://' || $offices-file) else ()"/>
    <xsl:param name="invocations-file" as="xs:string" select="''"/>
    <xsl:variable name="invocations" select="if ($invocations-file != '') then document('file://' || $invocations-file) else ()"/>
    <xsl:param name="bibliography-file" as="xs:string" select="''"/>
    <xsl:variable name="bibliography-authority" select="if ($bibliography-file != '') then document('file://' || $bibliography-file) else ()"/>

    <xsl:template match="tei:TEI" mode="extract-places">
        <xsl:for-each select=".//tei:div[@type='textpart']//tei:placeName[starts-with(@ref, '#geo')]">
            <xsl:variable name="geo-id" select="substring-after(@ref, '#')"/>
            <xsl:variable name="place" select="$geography//tei:place[@xml:id = $geo-id]"/>
            <xsl:variable name="displayName" select="normalize-space($place/tei:placeName[@xml:lang='en'])"/>
            <xsl:if test="string-length($displayName) > 0">
                <entity indexType="places">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="$geo-id"/></sortKey>
                    <pleiades><xsl:value-of select="string($place/tei:idno[@type='pleiades']/following-sibling::tei:link[contains(@target,'pleiades')]/@target)"/></pleiades>
                    <pleiadesId><xsl:value-of select="normalize-space($place/tei:idno[@type='pleiades'])"/></pleiadesId>
                    <geonames><xsl:value-of select="string($place/tei:idno[@type='geonames']/following-sibling::tei:link[contains(@target,'geonames')]/@target)"/></geonames>
                    <geonamesId><xsl:value-of select="normalize-space($place/tei:idno[@type='geonames'])"/></geonamesId>
                    <tib><xsl:value-of select="string($place/tei:idno[@type='TIB']/following-sibling::tei:link[contains(@target,'tib')]/@target)"/></tib>
                    <tibId><xsl:value-of select="normalize-space($place/tei:idno[@type='TIB'])"/></tibId>
                    <collectionName><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:rs[@type='collection-name'][@xml:lang='en'])"/></collectionName>
                    <invNr><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:idno[@type='inv-nr-current'][normalize-space()][1])"/></invNr>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <xsl:template match="tei:TEI" mode="extract-dignities">
        <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='dignity'][starts-with(@ref, '#d')]">
            <xsl:variable name="ref-id" select="substring-after(@ref, '#')"/>
            <xsl:variable name="item" select="$dignities//tei:item[@xml:id = $ref-id]"/>
            <!-- Use Greek term (matching original EFES), fall back to English -->
            <xsl:variable name="displayName" select="normalize-space(
                ($item/tei:term[@xml:lang='grc'], $item/tei:term[@xml:lang='la'], $item/tei:term[@xml:lang='en'])[normalize-space()][1]
            )"/>
            <xsl:if test="string-length($displayName) > 0">
                <entity indexType="dignities">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="$ref-id"/></sortKey>
                    <collectionName><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:rs[@type='collection-name'][@xml:lang='en'])"/></collectionName>
                    <invNr><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:idno[@type='inv-nr-current'][normalize-space()][1])"/></invNr>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <xsl:template match="tei:TEI" mode="extract-offices">
        <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='office'][@subtype][starts-with(@ref, '#of')]">
            <xsl:variable name="ref-id" select="substring-after(@ref, '#')"/>
            <xsl:variable name="item" select="$offices//tei:item[@xml:id = $ref-id]"/>
            <xsl:variable name="displayName" select="normalize-space(
                ($item/tei:term[@xml:lang='grc'], $item/tei:term[@xml:lang='la'], $item/tei:term[@xml:lang='en'])[normalize-space()][1]
            )"/>
            <xsl:if test="string-length($displayName) > 0">
                <entity indexType="offices">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="$ref-id"/></sortKey>
                    <officeType><xsl:value-of select="string(@subtype)"/></officeType>
                    <collectionName><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:rs[@type='collection-name'][@xml:lang='en'])"/></collectionName>
                    <invNr><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:idno[@type='inv-nr-current'][normalize-space()][1])"/></invNr>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <xsl:template match="tei:TEI" mode="extract-invocations">
        <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='invocation'][starts-with(@ref, '#inv')]">
            <xsl:variable name="ref-id" select="substring-after(@ref, '#')"/>
            <xsl:variable name="item" select="$invocations//tei:item[@xml:id = $ref-id]"/>
            <xsl:variable name="displayName" select="normalize-space(
                ($item/tei:term[@xml:lang='grc'], $item/tei:term[@xml:lang='la'], $item/tei:term[@xml:lang='en'])[normalize-space()][1]
            )"/>
            <xsl:if test="string-length($displayName) > 0">
                <entity indexType="invocations">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="$ref-id"/></sortKey>
                    <collectionName><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:rs[@type='collection-name'][@xml:lang='en'])"/></collectionName>
                    <invNr><xsl:value-of select="normalize-space(ancestor::tei:TEI//tei:idno[@type='inv-nr-current'][normalize-space()][1])"/></invNr>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: bibliography (Bibliography)                                  -->
    <!-- ================================================================== -->
    <idx:index id="bibliography" title="Bibliography" order="10" nav="bibliography">
        <idx:description>Bibliographic references cited in the seals.</idx:description>
        <idx:columns>
            <idx:column key="shortCitation">Citation</idx:column>
            <idx:column key="fullCitation">Full Citation</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
        <idx:sort>
            <idx:key field="shortCitation"/>
        </idx:sort>
    </idx:index>

    <xsl:template match="tei:TEI" mode="extract-bibliography">
        <xsl:for-each select=".//tei:body//tei:div//tei:bibl[tei:ptr[@target != '']]">
            <xsl:variable name="target" select="string(tei:ptr/@target)"/>
            <xsl:variable name="auth" select="$bibliography-authority//tei:bibl[@xml:id = $target]"/>
            <xsl:variable name="shortCitation" select="normalize-space($auth/tei:bibl[@type='abbrev'])"/>
            <xsl:variable name="fullCitation" select="normalize-space($auth)"/>

            <xsl:choose>
                <xsl:when test="tei:citedRange">
                    <xsl:for-each select="tei:citedRange">
                        <entity indexType="bibliography">
                            <bibRef><xsl:value-of select="$target"/></bibRef>
                            <sortKey><xsl:value-of select="lower-case(if ($shortCitation != '') then $shortCitation else $target)"/></sortKey>
                            <shortCitation><xsl:value-of select="$shortCitation"/></shortCitation>
                            <fullCitation><xsl:value-of select="$fullCitation"/></fullCitation>
                            <citedRange><xsl:value-of select="normalize-space(.)"/></citedRange>
                        </entity>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                    <entity indexType="bibliography">
                        <bibRef><xsl:value-of select="$target"/></bibRef>
                        <sortKey><xsl:value-of select="lower-case(if ($shortCitation != '') then $shortCitation else $target)"/></sortKey>
                        <shortCitation><xsl:value-of select="$shortCitation"/></shortCitation>
                        <fullCitation><xsl:value-of select="$fullCitation"/></fullCitation>
                        <citedRange/>
                    </entity>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- HOOKS for generic frontmatter XSL                                  -->
    <!-- ================================================================== -->

    <!-- Dispatch: calls all extraction templates -->
    <xsl:template match="tei:TEI" mode="extract-all-entities">
        <xsl:apply-templates select="." mode="extract-persons"/>
        <xsl:apply-templates select="." mode="extract-places"/>
        <xsl:apply-templates select="." mode="extract-dignities"/>
        <xsl:apply-templates select="." mode="extract-offices"/>
        <xsl:apply-templates select="." mode="extract-invocations"/>
        <xsl:apply-templates select="." mode="extract-bibliography"/>
    </xsl:template>

    <!-- Search facets -->
    <xsl:template match="tei:TEI" mode="extract-search">
        <xsl:param name="entities" tunnel="yes"/>

        <!-- Derive facets from entity data (now XML nodes) -->
        <xsl:variable name="places-list" select="$entities/places/entity"/>
        <xsl:variable name="dignities-list" select="$entities/dignities/entity"/>
        <xsl:variable name="offices-list" select="$entities/offices/entity"/>

        <xsl:variable name="personalNames" as="xs:string*"
            select="distinct-values(
                //tei:listPerson[@type='issuer']/tei:person/tei:persName[@xml:lang='en']/tei:forename
                    /normalize-space(.)[string-length(.) > 0]
            )"/>
        <xsl:variable name="familyNames" as="xs:string*"
            select="distinct-values(
                //tei:listPerson[@type='issuer']/tei:person/tei:persName[@xml:lang='en']/tei:surname
                    /normalize-space(.)[string-length(.) > 0]
            )"/>

        <xsl:variable name="genderValues" as="xs:string*">
            <xsl:for-each select="distinct-values(//tei:listPerson[@type='issuer']/tei:person/@gender)">
                <xsl:choose>
                    <xsl:when test=". = 'M'"><xsl:sequence select="'Male'"/></xsl:when>
                    <xsl:when test=". = 'F'"><xsl:sequence select="'Female'"/></xsl:when>
                    <xsl:when test=". = 'E'"><xsl:sequence select="'Eunuch'"/></xsl:when>
                    <xsl:otherwise><xsl:sequence select="string(.)"/></xsl:otherwise>
                </xsl:choose>
            </xsl:for-each>
        </xsl:variable>

        <xsl:variable name="milieuValues" as="xs:string*"
            select="distinct-values(
                //tei:listPerson[@type='issuer']/tei:person/@role
                    ! translate(., '-', ' ')
            )"/>

        <xsl:variable name="placeNamesList" as="xs:string*"
            select="distinct-values($places-list/name)"/>
        <xsl:variable name="dignityNamesList" as="xs:string*"
            select="distinct-values($dignities-list/name)"/>
        <xsl:variable name="civilOfficesList" as="xs:string*"
            select="distinct-values($offices-list[officeType = 'civil']/name)"/>
        <xsl:variable name="ecclesiasticalOfficesList" as="xs:string*"
            select="distinct-values($offices-list[officeType = 'ecclesiastical']/name)"/>
        <xsl:variable name="militaryOfficesList" as="xs:string*"
            select="distinct-values($offices-list[officeType = 'military']/name)"/>

        <xsl:variable name="metricalValue">
            <xsl:choose>
                <xsl:when test="//tei:div[@type='edition'][@subtype='editorial']//tei:div[@type='textpart']//tei:lg">yes</xsl:when>
                <xsl:otherwise>no</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xsl:variable name="monogramValues" as="xs:string*"
            select="distinct-values(
                //tei:div[@type='edition'][@subtype='editorial']
                    //tei:div[@type='textpart'][starts-with(@rend, 'monogram')]
                    /@rend ! replace(., '^monogram-?', '')
            )"/>

        <xsl:variable name="fullText" select="normalize-space(string-join(
            //tei:div[@type='edition'][@subtype='editorial']//text(), ' '
        ))"/>

        <!-- Document-level fields (needed for search result display) -->
        <title><xsl:value-of select="$title"/></title>
        <origDate><xsl:value-of select="string-join(//tei:origDate, ', ')"/></origDate>

        <objectType><xsl:value-of select="normalize-space(//tei:objectType/tei:term/tei:seg[@xml:lang='en'])"/></objectType>
        <material><xsl:value-of select="normalize-space(//tei:material/tei:seg[@xml:lang='en'])"/></material>
        <xsl:variable name="lang-code" select="string((//tei:div[@type='edition'][@subtype='editorial']//tei:div[@type='textpart']/@xml:lang)[1])"/>
        <language><xsl:value-of select="($language-labels[@code = $lang-code], $lang-code)[1]"/></language>
        <personalNames>
            <xsl:for-each select="$personalNames">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </personalNames>
        <familyNames>
            <xsl:for-each select="$familyNames">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </familyNames>
        <gender><xsl:value-of select="string($genderValues[1])"/></gender>
        <milieu>
            <xsl:for-each select="$milieuValues">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </milieu>
        <placeNames>
            <xsl:for-each select="$placeNamesList">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </placeNames>
        <dignities>
            <xsl:for-each select="$dignityNamesList">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </dignities>
        <civilOffices>
            <xsl:for-each select="$civilOfficesList">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </civilOffices>
        <ecclesiasticalOffices>
            <xsl:for-each select="$ecclesiasticalOfficesList">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </ecclesiasticalOffices>
        <militaryOffices>
            <xsl:for-each select="$militaryOfficesList">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </militaryOffices>
        <metrical><xsl:value-of select="string($metricalValue)"/></metrical>
        <monogram><xsl:value-of select="if (count($monogramValues) > 0)
            then string-join($monogramValues, ', ') else ''"/></monogram>
        <collection><xsl:value-of select="normalize-space(//tei:rs[@type='collection-name'][@xml:lang='en'])"/></collection>
        <xsl:variable name="notBefore" select="string(//tei:origDate/@notBefore)"/>
        <xsl:variable name="notAfter" select="string(//tei:origDate/@notAfter)"/>
        <dateNotBefore><xsl:value-of select="if ($notBefore castable as xs:integer) then xs:integer($notBefore) else $notBefore"/></dateNotBefore>
        <dateNotAfter><xsl:value-of select="if ($notAfter castable as xs:integer) then xs:integer($notAfter) else $notAfter"/></dateNotAfter>
        <fullText><xsl:value-of select="$fullText"/></fullText>
    </xsl:template>

    <!-- Project-specific page display fields -->
    <xsl:template match="tei:TEI" mode="extract-metadata">
        <category><xsl:value-of select="string-join(//tei:msDesc/tei:msContents/tei:summary[@n='whole']/tei:seg)"/></category>
    </xsl:template>

</xsl:stylesheet>
