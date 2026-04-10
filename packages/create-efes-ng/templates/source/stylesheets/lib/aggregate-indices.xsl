<?xml version="1.0" encoding="UTF-8"?>
<!--
    XSLT-based Index Aggregation

    Reads per-document metadata XML files and produces:
    - One JSON file per index type ({indexType}.json)
    - A summary file (_summary.json)

    Supports multilingual entities: fields are output as language-keyed objects
    (e.g., {"en": "Cephalonia", "de": "Kephalonia"}).

    Parameters:
    - metadata-files: space-separated list of absolute paths to metadata XML files
    - indices-config: absolute path to indices-config.xsl (for reading idx:index metadata)
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:idx="http://efes.info/indices"
    exclude-result-prefixes="xs fn idx">

    <xsl:output method="text" encoding="UTF-8"/>

    <!-- Space-separated list of absolute paths to metadata XML files -->
    <xsl:param name="metadata-files" as="xs:string*"/>
    <!-- Absolute path to indices-config.xsl -->
    <xsl:param name="indices-config" as="xs:string"/>

    <!-- Load all metadata documents -->
    <xsl:variable name="all-docs" select="for $f in $metadata-files return doc('file://' || $f)"/>

    <!-- Load index configuration from indices-config.xsl -->
    <xsl:variable name="config-doc" select="doc('file://' || $indices-config)"/>
    <xsl:variable name="index-configs" select="$config-doc//idx:index"/>

    <!-- Discover all languages from metadata -->
    <xsl:variable name="all-languages" select="distinct-values($all-docs/metadata/entities/@xml:lang)"/>

    <xsl:template name="aggregate" match="/">
        <!-- Collect all entities from all documents AND all languages -->
        <xsl:variable name="all-entities" as="element()*">
            <xsl:for-each select="$all-docs">
                <xsl:variable name="doc-id" select="string(/metadata/documentId)"/>
                <xsl:for-each select="/metadata/entities">
                    <xsl:variable name="lang" select="string(@xml:lang)"/>
                    <xsl:for-each select="*/entity">
                        <entity-with-ref>
                            <xsl:copy-of select="@*"/>
                            <xsl:attribute name="xml:lang" select="$lang"/>
                            <inscriptionId><xsl:value-of select="$doc-id"/></inscriptionId>
                            <xsl:copy-of select="*"/>
                        </entity-with-ref>
                    </xsl:for-each>
                </xsl:for-each>
            </xsl:for-each>
        </xsl:variable>

        <!-- Process each configured index type -->
        <xsl:for-each select="$index-configs">
            <xsl:variable name="index-id" select="string(@id)"/>
            <xsl:variable name="index-title" select="string(@title)"/>
            <xsl:variable name="index-order" select="(@order, 99)[1]"/>
            <xsl:variable name="index-description" select="string(idx:description)"/>

            <!-- Columns config as JSON array -->
            <xsl:variable name="columns-json" as="element(fn:array)">
                <fn:array key="columns">
                    <xsl:for-each select="idx:columns/idx:column">
                        <fn:map>
                            <fn:string key="key"><xsl:value-of select="@key"/></fn:string>
                            <fn:string key="header"><xsl:value-of select="."/></fn:string>
                            <xsl:if test="@type">
                                <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
                            </xsl:if>
                            <xsl:if test="@labelKey">
                                <fn:string key="labelKey"><xsl:value-of select="@labelKey"/></fn:string>
                            </xsl:if>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </xsl:variable>

            <!-- Notes as JSON array -->
            <xsl:variable name="notes-json" as="element(fn:array)?">
                <xsl:if test="idx:notes/idx:p">
                    <fn:array key="notes">
                        <xsl:for-each select="idx:notes/idx:p">
                            <fn:string><xsl:value-of select="."/></fn:string>
                        </xsl:for-each>
                    </fn:array>
                </xsl:if>
            </xsl:variable>

            <!-- Sort keys from config -->
            <xsl:variable name="sort-key-fields" select="idx:sort/idx:key/@field"/>

            <!-- Entities for this index type -->
            <xsl:variable name="index-entities"
                select="$all-entities[@indexType = $index-id]"/>

            <!-- Group by sortKey (across all languages) -->
            <xsl:variable name="grouped-entries" as="element(fn:array)">
                <fn:array key="entries">
                    <xsl:for-each-group select="$index-entities"
                        group-by="string(sortKey)">
                        <xsl:sort select="
                            if (exists($sort-key-fields))
                            then string-join(for $k in $sort-key-fields return string(current-group()[1]/*[local-name() = $k]), '|')
                            else current-grouping-key()"/>

                        <xsl:variable name="group" select="current-group()"/>
                        <fn:map>
                            <!-- For each field (excluding meta fields), collect per-language values -->
                            <xsl:variable name="first" select="$group[1]"/>
                            <xsl:for-each select="distinct-values($first/*/local-name()[not(. = ('inscriptionId', 'indexType'))])">
                                <xsl:variable name="field-name" select="."/>
                                <fn:map key="{$field-name}">
                                    <xsl:for-each select="$all-languages">
                                        <xsl:variable name="lang" select="."/>
                                        <xsl:variable name="lang-entity" select="$group[@xml:lang = $lang][1]"/>
                                        <xsl:if test="$lang-entity">
                                            <fn:string key="{$lang}">
                                                <xsl:value-of select="$lang-entity/*[local-name() = $field-name]"/>
                                            </fn:string>
                                        </xsl:if>
                                    </xsl:for-each>
                                </fn:map>
                            </xsl:for-each>

                            <!-- References array (language-independent) -->
                            <fn:array key="references">
                                <xsl:for-each-group select="$group" group-by="string(inscriptionId)">
                                    <xsl:sort select="current-grouping-key()"/>
                                    <fn:map>
                                        <fn:string key="inscriptionId"><xsl:value-of select="current-grouping-key()"/></fn:string>
                                    </fn:map>
                                </xsl:for-each-group>
                            </fn:array>
                        </fn:map>
                    </xsl:for-each-group>
                </fn:array>
            </xsl:variable>

            <!-- Build the complete JSON structure for this index -->
            <xsl:variable name="index-json" as="element(fn:map)">
                <fn:map>
                    <fn:string key="id"><xsl:value-of select="$index-id"/></fn:string>
                    <fn:string key="title"><xsl:value-of select="$index-title"/></fn:string>
                    <xsl:if test="$index-description != ''">
                        <fn:string key="description"><xsl:value-of select="$index-description"/></fn:string>
                    </xsl:if>
                    <xsl:sequence select="$columns-json"/>
                    <xsl:if test="$notes-json">
                        <xsl:sequence select="$notes-json"/>
                    </xsl:if>
                    <xsl:sequence select="$grouped-entries"/>
                </fn:map>
            </xsl:variable>

            <xsl:result-document href="{$index-id}.json" method="text">
                <xsl:value-of select="fn:xml-to-json($index-json, map{'indent': true()})"/>
            </xsl:result-document>
        </xsl:for-each>

        <!-- Principal result: _summary.json -->
        <xsl:variable name="summary-json" as="element(fn:map)">
            <fn:map>
                <fn:array key="indices">
                    <xsl:for-each select="$index-configs">
                        <xsl:sort select="xs:integer((@order, 99)[1])"/>
                        <xsl:variable name="index-id" select="string(@id)"/>
                        <xsl:variable name="index-entities"
                            select="$all-entities[@indexType = $index-id]"/>
                        <xsl:variable name="unique-count">
                            <xsl:value-of select="count(distinct-values(
                                $index-entities/sortKey[normalize-space()]
                            ))"/>
                        </xsl:variable>
                        <fn:map>
                            <fn:string key="id"><xsl:value-of select="$index-id"/></fn:string>
                            <fn:string key="title"><xsl:value-of select="@title"/></fn:string>
                            <xsl:if test="idx:description != ''">
                                <fn:string key="description"><xsl:value-of select="idx:description"/></fn:string>
                            </xsl:if>
                            <fn:number key="order"><xsl:value-of select="(@order, 99)[1]"/></fn:number>
                            <fn:string key="nav"><xsl:value-of select="(@nav, 'indices')[1]"/></fn:string>
                            <fn:number key="entryCount"><xsl:value-of select="$unique-count"/></fn:number>
                        </fn:map>
                    </xsl:for-each>
                </fn:array>
            </fn:map>
        </xsl:variable>

        <xsl:value-of select="fn:xml-to-json($summary-json, map{'indent': true()})"/>
    </xsl:template>

</xsl:stylesheet>
