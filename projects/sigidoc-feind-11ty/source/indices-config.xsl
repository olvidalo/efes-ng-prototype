<?xml version="1.0" encoding="UTF-8"?>
<!--
    Metadata & Index Configuration for SigiDoc FEIND

    This stylesheet is the project-specific counterpart to the generic
    extract-metadata.xsl library. It defines:

    1. Configuration (authority files, language labels)
    2. Index definitions (idx:index metadata + extract-{id} templates)
    3. Templates that override the defaults in extract-metadata.xsl:
       - extract-all-entities: dispatches to all extract-{id} templates
       - extract-search: search facet / filter fields
       - extract-metadata: project-specific page display fields

    To add a new index:
    1. Add an <idx:index> block with column metadata
    2. Add an <xsl:template mode="extract-{id}"> with extraction logic
    3. Add an <xsl:apply-templates> line to extract-all-entities
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:idx="http://efes.info/indices"
    exclude-result-prefixes="xs">

    <xsl:import href="stylesheets/lib/extract-metadata.xsl"/>

    <!-- ================================================================== -->
    <!-- CONFIGURATION                                                       -->
    <!-- ================================================================== -->

    <!-- Authority file paths (passed from pipeline for dependency tracking) -->
    <xsl:param name="geography-file" as="xs:string"/>
    <xsl:variable name="geography" select="document('file://' || $geography-file)"/>

    <xsl:param name="dignities-file" as="xs:string"/>
    <xsl:variable name="dignities" select="document('file://' || $dignities-file)"/>

    <xsl:param name="offices-file" as="xs:string"/>
    <xsl:variable name="offices" select="document('file://' || $offices-file)"/>

    <xsl:param name="invocations-file" as="xs:string"/>
    <xsl:variable name="invocations" select="document('file://' || $invocations-file)"/>

    <xsl:param name="bibliography-file" as="xs:string"/>
    <xsl:variable name="bibliography-authority" select="document('file://' || $bibliography-file)"/>

    <!-- Common fields for seal entity records (re-used across all index extraction templates) -->
    <xsl:variable name="seal-collection" select="normalize-space(//tei:rs[@type='collection-name'][@xml:lang='en'])"/>
    <xsl:variable name="seal-inv-nr" select="normalize-space(//tei:idno[@type='inv-nr-current'][normalize-space()][1])"/>


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
                    <collectionName><xsl:value-of select="$seal-collection"/></collectionName>
                    <invNr><xsl:value-of select="$seal-inv-nr"/></invNr>
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
                    <collectionName><xsl:value-of select="$seal-collection"/></collectionName>
                    <invNr><xsl:value-of select="$seal-inv-nr"/></invNr>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: dignities (Dignities)                                        -->
    <!-- ================================================================== -->
    <idx:index id="dignities" title="Dignities" order="3">
        <idx:description>Dignities and titles attested on seals.</idx:description>
        <idx:columns>
            <idx:column key="name">Dignity</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

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
                    <collectionName><xsl:value-of select="$seal-collection"/></collectionName>
                    <invNr><xsl:value-of select="$seal-inv-nr"/></invNr>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: offices (Offices)                                            -->
    <!-- ================================================================== -->
    <idx:index id="offices" title="Offices" order="4">
        <idx:description>Offices attested on seals.</idx:description>
        <idx:columns>
            <idx:column key="name">Office</idx:column>
            <idx:column key="officeType">Type</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

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
                    <collectionName><xsl:value-of select="$seal-collection"/></collectionName>
                    <invNr><xsl:value-of select="$seal-inv-nr"/></invNr>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: invocations (Invocations)                                    -->
    <!-- ================================================================== -->
    <idx:index id="invocations" title="Invocations" order="5">
        <idx:description>Invocations attested on seals.</idx:description>
        <idx:columns>
            <idx:column key="name">Invocation</idx:column>
            <idx:column key="references" type="references">Seals</idx:column>
        </idx:columns>
    </idx:index>

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
                    <collectionName><xsl:value-of select="$seal-collection"/></collectionName>
                    <invNr><xsl:value-of select="$seal-inv-nr"/></invNr>
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
    <!-- TEMPLATES FOR GENERIC EXTRACTION LIBRARY                            -->
    <!-- These override the empty defaults in extract-metadata.xsl.          -->
    <!-- The library calls them during metadata extraction for each document.-->
    <!-- ================================================================== -->

    <!-- Dispatches to all extract-{id} templates above -->
    <xsl:template match="tei:TEI" mode="extract-all-entities">
        <xsl:apply-templates select="." mode="extract-persons"/>
        <xsl:apply-templates select="." mode="extract-places"/>
        <xsl:apply-templates select="." mode="extract-dignities"/>
        <xsl:apply-templates select="." mode="extract-offices"/>
        <xsl:apply-templates select="." mode="extract-invocations"/>
        <xsl:apply-templates select="." mode="extract-bibliography"/>
    </xsl:template>

    <!-- Search facet and filter fields for FlexSearch index -->
    <xsl:template match="tei:TEI" mode="extract-search">
        <xsl:param name="entities" tunnel="yes"/>

        <!-- Fields shown in search result display -->
        <title><xsl:value-of select="$title"/></title>
        <origDate><xsl:value-of select="string-join(//tei:origDate, ', ')"/></origDate>

        <!-- Facet and filter fields -->
        <objectType><xsl:value-of select="normalize-space(//tei:objectType/tei:term/tei:seg[@xml:lang='en'])"/></objectType>
        <material><xsl:value-of select="normalize-space(//tei:material/tei:seg[@xml:lang='en'])"/></material>
        <xsl:variable name="lang" select="string((//tei:div[@type='edition'][@subtype='editorial']//tei:div[@type='textpart']/@xml:lang)[1])"/>
        <language>
            <xsl:choose>
                <xsl:when test="$lang = 'grc'">Ancient Greek</xsl:when>
                <xsl:when test="$lang = 'la'">Latin</xsl:when>
                <xsl:when test="$lang = 'grc-Latn'">Transliterated Greek</xsl:when>
                <xsl:otherwise><xsl:value-of select="$lang"/></xsl:otherwise>
            </xsl:choose>
        </language>
        <personalNames>
            <xsl:for-each select="//tei:listPerson[@type='issuer']/tei:person/tei:persName[@xml:lang='en']/tei:forename[normalize-space()]">
                <item><xsl:value-of select="normalize-space(.)"/></item>
            </xsl:for-each>
        </personalNames>
        <familyNames>
            <xsl:for-each select="//tei:listPerson[@type='issuer']/tei:person/tei:persName[@xml:lang='en']/tei:surname[normalize-space()]">
                <item><xsl:value-of select="normalize-space(.)"/></item>
            </xsl:for-each>
        </familyNames>
        <gender>
            <xsl:for-each select="//tei:listPerson[@type='issuer']/tei:person/@gender">
                <xsl:choose>
                    <xsl:when test=". = 'M'"><item>Male</item></xsl:when>
                    <xsl:when test=". = 'F'"><item>Female</item></xsl:when>
                    <xsl:when test=". = 'E'"><item>Eunuch</item></xsl:when>
                    <xsl:otherwise><item><xsl:value-of select="."/></item></xsl:otherwise>
                </xsl:choose>
            </xsl:for-each>
        </gender>
        <milieu>
            <xsl:for-each select="//tei:listPerson[@type='issuer']/tei:person/@role">
                <item><xsl:value-of select="translate(., '-', ' ')"/></item>
            </xsl:for-each>
        </milieu>
        <placeNames>
            <xsl:for-each select="$entities/places/entity/name">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </placeNames>
        <dignities>
            <xsl:for-each select="$entities/dignities/entity/name">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </dignities>
        <civilOffices>
            <xsl:for-each select="$entities/offices/entity[officeType = 'civil']/name">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </civilOffices>
        <ecclesiasticalOffices>
            <xsl:for-each select="$entities/offices/entity[officeType = 'ecclesiastical']/name">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </ecclesiasticalOffices>
        <militaryOffices>
            <xsl:for-each select="$entities/offices/entity[officeType = 'military']/name">
                <item><xsl:value-of select="."/></item>
            </xsl:for-each>
        </militaryOffices>
        <metrical><xsl:value-of select="if (//tei:div[@type='edition'][@subtype='editorial']//tei:div[@type='textpart']//tei:lg) then 'yes' else 'no'"/></metrical>
        <monogram><xsl:value-of select="string-join(distinct-values(
            //tei:div[@type='edition'][@subtype='editorial']
                //tei:div[@type='textpart'][starts-with(@rend, 'monogram')]
                /@rend ! replace(., '^monogram-?', '')), ', ')"/></monogram>
        <collection><xsl:value-of select="normalize-space(//tei:rs[@type='collection-name'][@xml:lang='en'])"/></collection>
        <xsl:variable name="notBefore" select="string(//tei:origDate/@notBefore)"/>
        <xsl:variable name="notAfter" select="string(//tei:origDate/@notAfter)"/>
        <dateNotBefore><xsl:value-of select="if ($notBefore castable as xs:integer) then xs:integer($notBefore) else $notBefore"/></dateNotBefore>
        <dateNotAfter><xsl:value-of select="if ($notAfter castable as xs:integer) then xs:integer($notAfter) else $notAfter"/></dateNotAfter>
        <fullText><xsl:value-of select="normalize-space(string-join(
            //tei:div[@type='edition'][@subtype='editorial']//text(), ' '))"/></fullText>
    </xsl:template>

    <!-- Project-specific page display fields (added to <page> in metadata output) -->
    <xsl:template match="tei:TEI" mode="extract-metadata">
        <category><xsl:value-of select="string-join(//tei:msDesc/tei:msContents/tei:summary[@n='whole']/tei:seg)"/></category>
    </xsl:template>

</xsl:stylesheet>
