<?xml version="1.0" encoding="UTF-8"?>
<!--
    XSLT-based Index Aggregation

    Reads per-document metadata XML files and produces:
    - One JSON file per index type ({indexType}.json)
    - A summary file (_summary.json)

    Entity identity: entities with the same @xml:id are merged into one
    index entry. Entities without @xml:id are unique per occurrence.

    Multilingual fields: fields with @xml:lang produce language-keyed
    JSON objects (e.g., {"en": "Cephalonia", "de": "Kephalonia"}).
    Fields without @xml:lang produce plain strings.

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

    <!-- Serialize a field element as a JSON value (fn:string or fn:map) -->
    <xsl:template name="serialize-field-value">
        <xsl:param name="field" as="element()"/>
        <xsl:param name="key" as="xs:string"/>
        <xsl:choose>
            <xsl:when test="$field/*">
                <fn:map key="{$key}">
                    <xsl:for-each select="$field/*">
                        <fn:string key="{local-name()}"><xsl:value-of select="."/></fn:string>
                    </xsl:for-each>
                </fn:map>
            </xsl:when>
            <xsl:otherwise>
                <fn:string key="{$key}"><xsl:value-of select="$field"/></fn:string>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Space-separated list of absolute paths to metadata XML files -->
    <xsl:param name="metadata-files" as="xs:string*"/>
    <!-- Absolute path to indices-config.xsl -->
    <xsl:param name="indices-config" as="xs:string"/>

    <!-- Load all metadata documents -->
    <xsl:variable name="all-docs" select="for $f in $metadata-files return doc('file://' || $f)"/>

    <!-- Load index configuration from indices-config.xsl -->
    <xsl:variable name="config-doc" select="doc('file://' || $indices-config)"/>
    <xsl:variable name="index-configs" select="$config-doc//idx:index"/>

    <xsl:template name="aggregate" match="/">
        <!-- Collect all entities from all documents, annotated with inscriptionId -->
        <xsl:variable name="all-entities" as="element()*">
            <xsl:for-each select="$all-docs">
                <xsl:variable name="doc-id" select="string(/metadata/documentId)"/>
                <xsl:for-each select="/metadata/entities/*/entity">
                    <entity-with-ref>
                        <xsl:copy-of select="@*"/>
                        <inscriptionId><xsl:value-of select="$doc-id"/></inscriptionId>
                        <xsl:copy-of select="*"/>
                    </entity-with-ref>
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

            <!-- Group by @xml:id if present, else by sortKey -->
            <xsl:variable name="grouped-entries" as="element(fn:array)">
                <fn:array key="entries">
                    <xsl:for-each-group select="$index-entities"
                        group-by="if (@xml:id) then string(@xml:id) else string(sortKey[1])">
                        <xsl:sort select="
                            if (exists($sort-key-fields))
                            then string-join(for $k in $sort-key-fields return string(current-group()[1]/*[local-name() = $k][1]), '|')
                            else string(current-group()[1]/*[local-name() = 'sortKey'][1])"/>

                        <xsl:variable name="group" select="current-group()"/>
                        <fn:map>
                            <!-- Collect all distinct field names (excluding meta fields) -->
                            <xsl:for-each select="distinct-values($group/*/local-name()[not(. = 'inscriptionId')])">
                                <xsl:variable name="field-name" select="."/>
                                <xsl:variable name="field-elements" select="$group/*[local-name() = $field-name]"/>

                                <xsl:choose>
                                    <!-- Has xml:lang → language-keyed object -->
                                    <xsl:when test="$field-elements[@xml:lang]">
                                        <fn:map key="{$field-name}">
                                            <xsl:for-each select="distinct-values($field-elements/@xml:lang)">
                                                <xsl:variable name="lang" select="."/>
                                                <xsl:call-template name="serialize-field-value">
                                                    <xsl:with-param name="field" select="$field-elements[@xml:lang = $lang][1]"/>
                                                    <xsl:with-param name="key" select="$lang"/>
                                                </xsl:call-template>
                                            </xsl:for-each>
                                        </fn:map>
                                    </xsl:when>
                                    <!-- No xml:lang → plain value -->
                                    <xsl:otherwise>
                                        <xsl:call-template name="serialize-field-value">
                                            <xsl:with-param name="field" select="$field-elements[1]"/>
                                            <xsl:with-param name="key" select="$field-name"/>
                                        </xsl:call-template>
                                    </xsl:otherwise>
                                </xsl:choose>
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
                        <xsl:variable name="unique-count" select="count(distinct-values(
                            for $e in $index-entities
                            return if ($e/@xml:id) then string($e/@xml:id) else string($e/sortKey[1])
                        ))"/>
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
