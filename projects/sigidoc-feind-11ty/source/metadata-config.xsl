<?xml version="1.0" encoding="UTF-8"?>
<!--
    Index configuration for SigiDoc FEIND.

    The framework calls each hook template once per configured language,
    passing $language as a tunnel param. Output plain elements; the
    framework auto-stamps xml:lang.

    Globally available variables from extract-metadata.xsl:
    $filename   - document filename without .xml extension
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:idx="urn:efes-ng:indices"
    exclude-result-prefixes="#all">

    <xsl:import href="stylesheets/lib/extract-metadata.xsl"/>

    <!-- Authority files (paths passed from pipeline for dependency tracking) -->
    <xsl:param name="geography-file" as="xs:string"/>
    <xsl:variable name="geography" select="document('file://' || $geography-file)"/>

    <xsl:param name="dignities-file" as="xs:string"/>
    <xsl:variable name="dignities" select="document('file://' || $dignities-file)"/>

    <xsl:param name="offices-file" as="xs:string"/>
    <xsl:variable name="offices" select="document('file://' || $offices-file)"/>

    <xsl:param name="invocations-file" as="xs:string"/>
    <xsl:variable name="invocations" select="document('file://' || $invocations-file)"/>

    <xsl:param name="bibliography-file" as="xs:string"/>
    <xsl:variable name="bibliography" select="document('file://' || $bibliography-file)"/>

    <!-- ================================================================== -->
    <!-- SHARED VARIABLES                                                       -->
    <!-- ================================================================== -->

    <!--
        Create a variant of the document ID that sorts naturally with mixed alphanumeric document
        IDs such as Feind_SB123 or M.23. Alphabetical sort puts Feind_Kr10 before Feind_Kr2,
        so we pad the numeric part with zeros:
            Feind_Kr2   -> Feind_Kr00002
            Feind_Kr10  -> Feind_Kr00010
    -->
    <xsl:variable name="sortKey" select="
       replace($filename, '\d+$', '') || format-number(xs:integer(replace($filename, '^\D+', '')), '00000')
    "/>

    <!-- ================================================================== -->
    <!-- PAGE METADATA                                                       -->
    <!-- ================================================================== -->

    <xsl:template match="tei:TEI" mode="extract-metadata">
        <xsl:param name="language" tunnel="yes"/>
        <xsl:variable name="tei-title" select="normalize-space(
            (//tei:titleStmt/tei:title[@xml:lang=$language], //tei:titleStmt/tei:title)[1]
        )"/>
        <title><xsl:value-of select="if (string-length($tei-title) > 0) then $tei-title else $filename"/></title>

        <!-- Re-use sortKey variable defined above -->
        <sortKey><xsl:value-of select="$sortKey"/></sortKey>

        <origDate><xsl:value-of select="normalize-space(
            (//tei:origDate/tei:seg[@xml:lang=$language], //tei:origDate)[1]
        )"/></origDate>
        <category><xsl:value-of select="normalize-space(
            (//tei:msContents/tei:summary[@n='whole']/tei:seg[@xml:lang=$language],
             //tei:msContents/tei:summary[@n='whole'])[1]
        )"/></category>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: persons                                                      -->
    <!-- ================================================================== -->
    <idx:index id="persons" order="1">
        <idx:title xml:lang="en">Persons</idx:title>
        <idx:title xml:lang="de">Personen</idx:title>
        <idx:title xml:lang="el">Πρόσωπα</idx:title>
        <idx:description xml:lang="en">Prosopography of seal issuers.</idx:description>
        <idx:description xml:lang="de">Prosopographie der Siegelaussteller.</idx:description>
        <idx:description xml:lang="el">Προσωπογραφία εκδοτών σφραγίδων.</idx:description>
        <idx:columns>
            <idx:column key="name">
                <idx:label xml:lang="en">Name</idx:label>
                <idx:label xml:lang="de">Name</idx:label>
                <idx:label xml:lang="el">Όνομα</idx:label>
            </idx:column>
            <idx:column key="references" type="references">
                <idx:label xml:lang="en">Seals</idx:label>
                <idx:label xml:lang="de">Siegel</idx:label>
                <idx:label xml:lang="el">Σφραγίδες</idx:label>
            </idx:column>
        </idx:columns>
    </idx:index>

    <xsl:template match="tei:TEI" mode="extract-persons">
        <xsl:param name="language" tunnel="yes"/>
        <xsl:for-each select=".//tei:listPerson[@type='issuer']/tei:person">
            <xsl:variable name="name" select="(tei:persName[@xml:lang=$language], tei:persName)[1]"/>
            <xsl:variable name="displayName" select="normalize-space(
                string-join(($name/tei:forename, $name/tei:surname)[normalize-space()], ' ')
            )"/>
            <xsl:if test="$displayName">
                <entity indexType="persons">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="lower-case($displayName)"/></sortKey>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: places                                                       -->
    <!-- ================================================================== -->
    <idx:index id="places" order="2">
        <idx:title xml:lang="en">Place Names</idx:title>
        <idx:title xml:lang="de">Ortsnamen</idx:title>
        <idx:title xml:lang="el">Τοπωνύμια</idx:title>
        <idx:description xml:lang="en">Place names attested on seals.</idx:description>
        <idx:description xml:lang="de">Auf Siegeln belegte Ortsnamen.</idx:description>
        <idx:description xml:lang="el">Τοπωνύμια που μαρτυρούνται σε σφραγίδες.</idx:description>
        <idx:columns>
            <idx:column key="name">
                <idx:label xml:lang="en">Name</idx:label>
                <idx:label xml:lang="de">Name</idx:label>
                <idx:label xml:lang="el">Όνομα</idx:label>
            </idx:column>
            <idx:column key="pleiades" type="link"><idx:label>Pleiades</idx:label></idx:column>
            <idx:column key="geonames" type="link"><idx:label>Geonames</idx:label></idx:column>
            <idx:column key="tib" type="link"><idx:label>TIB</idx:label></idx:column>
            <idx:column key="references" type="references">
                <idx:label xml:lang="en">Seals</idx:label>
                <idx:label xml:lang="de">Siegel</idx:label>
                <idx:label xml:lang="el">Σφραγίδες</idx:label>
            </idx:column>
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
            <xsl:if test="$displayName">
                <xsl:variable name="pleiades-id" select="normalize-space($place/tei:idno[@type='pleiades'])"/>
                <xsl:variable name="geonames-id" select="normalize-space($place/tei:idno[@type='geonames'])"/>
                <xsl:variable name="tib-id" select="normalize-space($place/tei:idno[@type='TIB'])"/>
                <entity indexType="places" xml:id="{$geo-id}">
                    <name><xsl:value-of select="$displayName"/></name>
                    <xsl:if test="$pleiades-id">
                        <pleiades>
                            <url><xsl:value-of select="concat('https://pleiades.stoa.org/places/', $pleiades-id)"/></url>
                            <label><xsl:value-of select="$pleiades-id"/></label>
                        </pleiades>
                    </xsl:if>
                    <xsl:if test="$geonames-id">
                        <geonames>
                            <url><xsl:value-of select="concat('https://www.geonames.org/', $geonames-id)"/></url>
                            <label><xsl:value-of select="$geonames-id"/></label>
                        </geonames>
                    </xsl:if>
                    <xsl:if test="$tib-id">
                        <tib>
                            <url><xsl:value-of select="string($place/tei:idno[@type='TIB']/following-sibling::tei:link[1]/@target)"/></url>
                            <label><xsl:value-of select="$tib-id"/></label>
                        </tib>
                    </xsl:if>
                    <sortKey><xsl:value-of select="lower-case($displayName)"/></sortKey>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: dignities                                                    -->
    <!-- ================================================================== -->
    <idx:index id="dignities" order="3">
        <idx:title xml:lang="en">Dignities</idx:title>
        <idx:title xml:lang="de">Würden</idx:title>
        <idx:title xml:lang="el">Αξιώματα</idx:title>
        <idx:description xml:lang="en">Dignities and titles attested on seals.</idx:description>
        <idx:description xml:lang="de">Auf Siegeln belegte Würden und Titel.</idx:description>
        <idx:description xml:lang="el">Αξιώματα και τίτλοι που μαρτυρούνται σε σφραγίδες.</idx:description>
        <idx:columns>
            <idx:column key="name"><idx:label>Dignity</idx:label></idx:column>
            <idx:column key="references" type="references">
                <idx:label xml:lang="en">Seals</idx:label>
                <idx:label xml:lang="de">Siegel</idx:label>
                <idx:label xml:lang="el">Σφραγίδες</idx:label>
            </idx:column>
        </idx:columns>
    </idx:index>

    <xsl:template match="tei:TEI" mode="extract-dignities">
        <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='dignity'][starts-with(@ref, '#d')]">
            <xsl:variable name="ref-id" select="substring-after(@ref, '#')"/>
            <xsl:variable name="displayName" select="normalize-space(
                ($dignities//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='grc'],
                 $dignities//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='la'],
                 $dignities//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='en'])[normalize-space()][1]
            )"/>
            <xsl:if test="$displayName">
                <entity indexType="dignities" xml:id="{$ref-id}">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="$ref-id"/></sortKey>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: offices                                                      -->
    <!-- ================================================================== -->
    <idx:index id="offices" order="4">
        <idx:title xml:lang="en">Offices</idx:title>
        <idx:title xml:lang="de">Ämter</idx:title>
        <idx:title xml:lang="el">Υπηρεσίες</idx:title>
        <idx:description xml:lang="en">Offices attested on seals.</idx:description>
        <idx:description xml:lang="de">Auf Siegeln belegte Ämter.</idx:description>
        <idx:description xml:lang="el">Υπηρεσίες που μαρτυρούνται σε σφραγίδες.</idx:description>
        <idx:columns>
            <idx:column key="name"><idx:label>Office</idx:label></idx:column>
            <idx:column key="officeType"><idx:label>Type</idx:label></idx:column>
            <idx:column key="references" type="references">
                <idx:label xml:lang="en">Seals</idx:label>
                <idx:label xml:lang="de">Siegel</idx:label>
                <idx:label xml:lang="el">Σφραγίδες</idx:label>
            </idx:column>
        </idx:columns>
    </idx:index>

    <xsl:template match="tei:TEI" mode="extract-offices">
        <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='office'][@subtype][starts-with(@ref, '#of')]">
            <xsl:variable name="ref-id" select="substring-after(@ref, '#')"/>
            <xsl:variable name="displayName" select="normalize-space(
                ($offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='grc'],
                 $offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='la'],
                 $offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='en'])[normalize-space()][1]
            )"/>
            <xsl:if test="$displayName">
                <entity indexType="offices" xml:id="{$ref-id}">
                    <name><xsl:value-of select="$displayName"/></name>
                    <officeType><xsl:value-of select="string(@subtype)"/></officeType>
                    <sortKey><xsl:value-of select="$ref-id"/></sortKey>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: invocations                                                  -->
    <!-- ================================================================== -->
    <idx:index id="invocations" order="5">
        <idx:title xml:lang="en">Invocations</idx:title>
        <idx:title xml:lang="de">Anrufungen</idx:title>
        <idx:title xml:lang="el">Επικλήσεις</idx:title>
        <idx:description xml:lang="en">Invocations attested on seals.</idx:description>
        <idx:description xml:lang="de">Auf Siegeln belegte Anrufungen.</idx:description>
        <idx:description xml:lang="el">Επικλήσεις που μαρτυρούνται σε σφραγίδες.</idx:description>
        <idx:columns>
            <idx:column key="name"><idx:label>Invocation</idx:label></idx:column>
            <idx:column key="references" type="references">
                <idx:label xml:lang="en">Seals</idx:label>
                <idx:label xml:lang="de">Siegel</idx:label>
                <idx:label xml:lang="el">Σφραγίδες</idx:label>
            </idx:column>
        </idx:columns>
    </idx:index>

    <xsl:template match="tei:TEI" mode="extract-invocations">
        <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='invocation'][starts-with(@ref, '#inv')]">
            <xsl:variable name="ref-id" select="substring-after(@ref, '#')"/>
            <xsl:variable name="displayName" select="normalize-space(
                ($invocations//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='grc'],
                 $invocations//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='la'],
                 $invocations//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='en'])[normalize-space()][1]
            )"/>
            <xsl:if test="$displayName">
                <entity indexType="invocations" xml:id="{$ref-id}">
                    <name><xsl:value-of select="$displayName"/></name>
                    <sortKey><xsl:value-of select="$ref-id"/></sortKey>
                </entity>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- INDEX: bibliography                                                 -->
    <!-- ================================================================== -->
    <idx:index id="bibliography" nav="bibliography" order="10">
        <idx:title xml:lang="en">Bibliography</idx:title>
        <idx:title xml:lang="de">Bibliographie</idx:title>
        <idx:title xml:lang="el">Βιβλιογραφία</idx:title>
        <idx:description xml:lang="en">Bibliographic references cited in the seals.</idx:description>
        <idx:columns>
            <idx:column key="shortCitation"><idx:label>Citation</idx:label></idx:column>
            <idx:column key="fullCitation"><idx:label>Full Citation</idx:label></idx:column>
            <idx:column key="references" type="references">
                <idx:label xml:lang="en">Seals</idx:label>
                <idx:label xml:lang="de">Siegel</idx:label>
                <idx:label xml:lang="el">Σφραγίδες</idx:label>
            </idx:column>
        </idx:columns>
    </idx:index>

    <xsl:template match="tei:TEI" mode="extract-bibliography">
        <xsl:for-each select=".//tei:body//tei:div//tei:bibl[tei:ptr[@target != '']]">
            <xsl:variable name="target" select="string(tei:ptr/@target)"/>
            <xsl:variable name="auth" select="$bibliography//tei:bibl[@xml:id = $target]"/>
            <xsl:variable name="shortCitation" select="normalize-space($auth/tei:bibl[@type='abbrev'])"/>
            <xsl:variable name="bibl" select="."/>
            <xsl:for-each select="if ($bibl/tei:citedRange) then $bibl/tei:citedRange else $bibl">
                <entity indexType="bibliography" xml:id="{$target}">
                    <bibRef><xsl:value-of select="$target"/></bibRef>
                    <shortCitation><xsl:value-of select="$shortCitation"/></shortCitation>
                    <fullCitation>
                        <authors><xsl:value-of select="string-join(
                            for $a in $auth/tei:author
                            return normalize-space(string-join(($a/tei:forename, $a/tei:surname), ' ')),
                            ', ')"/></authors>
                        <title><xsl:value-of select="normalize-space($auth/tei:title[1])"/></title>
                        <pubPlace><xsl:value-of select="normalize-space(($auth/tei:pubPlace[@xml:lang='en'], $auth/tei:pubPlace)[1])"/></pubPlace>
                        <publisher><xsl:value-of select="normalize-space(($auth/tei:publisher)[1])"/></publisher>
                        <date><xsl:value-of select="normalize-space(($auth/tei:date)[1])"/></date>
                    </fullCitation>
                    <xsl:if test="self::tei:citedRange">
                        <citedRange><xsl:value-of select="normalize-space(.)"/></citedRange>
                    </xsl:if>
                    <sortKey><xsl:value-of select="($shortCitation[not(. = '')], $target)[1]"/></sortKey>
                </entity>
            </xsl:for-each>
        </xsl:for-each>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- DISPATCH + SEARCH                                                   -->
    <!-- ================================================================== -->

    <xsl:template match="tei:TEI" mode="extract-all-entities">
        <xsl:apply-templates select="." mode="extract-persons"/>
        <xsl:apply-templates select="." mode="extract-places"/>
        <xsl:apply-templates select="." mode="extract-dignities"/>
        <xsl:apply-templates select="." mode="extract-offices"/>
        <xsl:apply-templates select="." mode="extract-invocations"/>
        <xsl:apply-templates select="." mode="extract-bibliography"/>
    </xsl:template>

    <xsl:template match="tei:TEI" mode="extract-search">
        <xsl:param name="language" tunnel="yes"/>

        <!-- Display fields -->
        <xsl:variable name="tei-title" select="normalize-space(
            (.//tei:titleStmt/tei:title[@xml:lang=$language], .//tei:titleStmt/tei:title)[1]
        )"/>
        <title><xsl:value-of select="if (string-length($tei-title) > 0) then $tei-title else $filename"/></title>
        <origDate><xsl:value-of select="normalize-space(
            (//tei:origDate/tei:seg[@xml:lang=$language], //tei:origDate)[1]
        )"/></origDate>
        <placeName>
            <xsl:value-of select="
            .//tei:div[@type='textpart']//tei:placeName/@ref[starts-with(., '#geo')]
            ! $geography//tei:place[@xml:id = .]/tei:placeName[@xml:lang='en']
        "/>
        </placeName>
        <!-- Re-use sortKey variable defined above -->
        <sortKey><xsl:value-of select="$sortKey"/></sortKey>

        <!-- Facets -->
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
                <xsl:for-each select="tokenize(normalize-space(.), ' ')">
                    <!-- Replace - with space and capitalize each word (e.g. "secular-church" -> "Secular Church" -->
                    <item><xsl:value-of select="string-join(
                      tokenize(translate(., '-', ' '), '\s+') ! (upper-case(substring(., 1, 1)) || substring(., 2)),
                      ' '
                    )"/></item>
                </xsl:for-each>
            </xsl:for-each>
        </milieu>
        <!-- Place/dignity/office facets: re-extract directly from TEI -->
        <placeNames>
            <xsl:for-each select=".//tei:div[@type='textpart']//tei:placeName[starts-with(@ref, '#geo')]">
                <xsl:variable name="geo-id" select="substring-after(string(@ref), '#')"/>
                <xsl:variable name="pn" select="normalize-space($geography//tei:place[@xml:id = $geo-id]/tei:placeName[@xml:lang='en'])"/>
                <xsl:if test="$pn"><item><xsl:value-of select="$pn"/></item></xsl:if>
            </xsl:for-each>
        </placeNames>
        <dignities>
            <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='dignity'][starts-with(@ref, '#d')]">
                <xsl:variable name="ref-id" select="substring-after(string(@ref), '#')"/>
                <xsl:variable name="dn" select="normalize-space(
                    ($dignities//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='grc'],
                     $dignities//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='en'])[normalize-space()][1]
                )"/>
                <xsl:if test="$dn"><item><xsl:value-of select="$dn"/></item></xsl:if>
            </xsl:for-each>
        </dignities>
        <civilOffices>
            <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='office'][@subtype='civil'][starts-with(@ref, '#of')]">
                <xsl:variable name="ref-id" select="substring-after(string(@ref), '#')"/>
                <xsl:variable name="displayName" select="normalize-space(
                    ($offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='grc'],
                     $offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='en'])[normalize-space()][1]
                )"/>
                <xsl:if test="$displayName"><item><xsl:value-of select="$displayName"/></item></xsl:if>
            </xsl:for-each>
        </civilOffices>
        <ecclesiasticalOffices>
            <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='office'][@subtype='ecclesiastical'][starts-with(@ref, '#of')]">
                <xsl:variable name="ref-id" select="substring-after(string(@ref), '#')"/>
                <xsl:variable name="displayName" select="normalize-space(
                    ($offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='grc'],
                     $offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='en'])[normalize-space()][1]
                )"/>
                <xsl:if test="$displayName"><item><xsl:value-of select="$displayName"/></item></xsl:if>
            </xsl:for-each>
        </ecclesiasticalOffices>
        <militaryOffices>
            <xsl:for-each select=".//tei:div[@type='textpart']//tei:rs[@type='office'][@subtype='military'][starts-with(@ref, '#of')]">
                <xsl:variable name="ref-id" select="substring-after(string(@ref), '#')"/>
                <xsl:variable name="displayName" select="normalize-space(
                    ($offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='grc'],
                     $offices//tei:item[@xml:id = $ref-id]/tei:term[@xml:lang='en'])[normalize-space()][1]
                )"/>
                <xsl:if test="$displayName"><item><xsl:value-of select="$displayName"/></item></xsl:if>
            </xsl:for-each>
        </militaryOffices>
        <metrical><xsl:value-of select="if (//tei:div[@type='edition'][@subtype='editorial']//tei:div[@type='textpart']//tei:lg) then 'Yes' else 'No'"/></metrical>
        <monogram>
            <xsl:for-each select="
                distinct-values(
                  //tei:div[@type='edition'][@subtype='editorial']
                    //tei:div[@type='textpart'][starts-with(@rend, 'monogram-')]
                    /@rend ! replace(., '^monogram-', '')
                )
            ">
                <item>
                    <xsl:value-of select="upper-case(substring(., 1, 1)) || substring(., 2)"/>
                </item>
            </xsl:for-each>
        </monogram>
        <xsl:variable name="notBefore" select="string(//tei:origDate/@notBefore)"/>
        <xsl:variable name="notAfter" select="string(//tei:origDate/@notAfter)"/>
        <dateNotBefore><xsl:value-of select="if ($notBefore castable as xs:integer) then xs:integer($notBefore) else $notBefore"/></dateNotBefore>
        <dateNotAfter><xsl:value-of select="if ($notAfter castable as xs:integer) then xs:integer($notAfter) else $notAfter"/></dateNotAfter>
        <fullText><xsl:value-of select="normalize-space(string-join(
            //tei:div[@type='edition'][@subtype='editorial']//text(), ' '))"/></fullText>
    </xsl:template>

</xsl:stylesheet>
