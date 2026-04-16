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
    - metadata-config: absolute path to metadata-config.xsl (for reading idx:index metadata)
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:idx="urn:efes-ng:indices"
    exclude-result-prefixes="xs fn idx">

    <xsl:output method="text" encoding="UTF-8"/>

    <!-- Serialize a field element as a JSON value (fn:string or fn:map for structured fields) -->
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

    <!-- Serialize all fields from a set of elements as JSON map entries.
         Groups by field name, handles xml:lang → language-keyed objects. -->
    <xsl:template name="serialize-fields">
        <xsl:param name="elements" as="element()*"/>
        <xsl:param name="exclude" as="xs:string*" select="()"/>
        <xsl:for-each select="distinct-values($elements/*/local-name()[not(. = $exclude)])">
            <xsl:variable name="field-name" select="."/>
            <xsl:variable name="field-elements" select="$elements/*[local-name() = $field-name]"/>
            <xsl:choose>
                <xsl:when test="$field-elements[@xml:lang]">
                    <fn:map key="{$field-name}">
                        <xsl:for-each select="distinct-values($field-elements/@xml:lang)">
                            <xsl:call-template name="serialize-field-value">
                                <xsl:with-param name="field" select="$field-elements[@xml:lang = current()][1]"/>
                                <xsl:with-param name="key" select="."/>
                            </xsl:call-template>
                        </xsl:for-each>
                    </fn:map>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:call-template name="serialize-field-value">
                        <xsl:with-param name="field" select="$field-elements[1]"/>
                        <xsl:with-param name="key" select="$field-name"/>
                    </xsl:call-template>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:for-each>
    </xsl:template>

    <!-- Serialize idx:title, idx:description, or idx:label elements as JSON.
         Always produces a language-keyed object {"en":"...","de":"..."}.
         Elements without xml:lang are filed under "en". -->
    <xsl:template name="serialize-lang-text">
        <xsl:param name="elements" as="element()*"/>
        <xsl:param name="key" as="xs:string"/>
        <xsl:if test="$elements">
            <fn:map key="{$key}">
                <xsl:for-each select="$elements">
                    <fn:string key="{(@xml:lang, 'en')[1]}"><xsl:value-of select="."/></fn:string>
                </xsl:for-each>
            </fn:map>
        </xsl:if>
    </xsl:template>

    <!-- Space-separated list of absolute paths to metadata XML files -->
    <xsl:param name="metadata-files" as="xs:string*"/>
    <!-- Absolute path to metadata-config.xsl -->
    <xsl:param name="metadata-config" as="xs:string"/>

    <!-- Load all metadata documents -->
    <xsl:variable name="all-docs" select="for $f in $metadata-files return doc('file://' || $f)"/>

    <!-- Load index configuration from metadata-config.xsl -->
    <xsl:variable name="config-doc" select="doc('file://' || $metadata-config)"/>
    <xsl:variable name="index-configs" select="$config-doc//idx:index"/>

    <xsl:template name="aggregate" match="/">
        <!-- Collect all entities from all documents, annotated with documentId -->
        <xsl:variable name="all-entities" as="element()*">
            <xsl:for-each select="$all-docs">
                <xsl:variable name="doc-id" select="string(/metadata/documentId)"/>
                <xsl:for-each select="/metadata/entities/*/entity">
                    <entity-with-ref>
                        <xsl:copy-of select="@*"/>
                        <documentId><xsl:value-of select="$doc-id"/></documentId>
                        <xsl:copy-of select="*"/>
                    </entity-with-ref>
                </xsl:for-each>
            </xsl:for-each>
        </xsl:variable>

        <!-- Process each configured index type -->
        <xsl:for-each select="$index-configs">
            <xsl:variable name="index-id" select="string(@id)"/>
            <xsl:variable name="index-order" select="(@order, 99)[1]"/>

            <!-- Columns config as JSON array -->
            <xsl:variable name="columns-json" as="element(fn:array)">
                <fn:array key="columns">
                    <xsl:for-each select="idx:columns/idx:column">
                        <fn:map>
                            <fn:string key="key"><xsl:value-of select="@key"/></fn:string>
                            <xsl:call-template name="serialize-lang-text">
                                <xsl:with-param name="elements" select="idx:label"/>
                                <xsl:with-param name="key" select="'header'"/>
                            </xsl:call-template>
                            <xsl:if test="@type">
                                <fn:string key="type"><xsl:value-of select="@type"/></fn:string>
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

            <!-- Entities for this index type -->
            <xsl:variable name="index-entities"
                select="$all-entities[@indexType = $index-id]"/>

            <!-- Group by @xml:id if present, else by sortKey -->
            <xsl:variable name="grouped-entries" as="element(fn:array)">
                <fn:array key="entries">
                    <xsl:for-each-group select="$index-entities"
                        group-by="if (@xml:id) then string(@xml:id) else string(sortKey[1])">
                        <xsl:sort select="string(current-group()[1]/*[local-name() = 'sortKey'][1])"/>

                        <xsl:variable name="group" select="current-group()"/>
                        <fn:map>
                            <!-- Entry-level fields (from all entities in group) -->
                            <xsl:call-template name="serialize-fields">
                                <xsl:with-param name="elements" select="$group"/>
                                <xsl:with-param name="exclude" select="'documentId'"/>
                            </xsl:call-template>

                            <!-- References array (per entity, all fields) -->
                            <fn:array key="references">
                                <xsl:for-each select="$group">
                                    <xsl:sort select="string(documentId)"/>
                                    <fn:map>
                                        <fn:string key="documentId"><xsl:value-of select="documentId"/></fn:string>
                                        <xsl:call-template name="serialize-fields">
                                            <xsl:with-param name="elements" select="."/>
                                            <xsl:with-param name="exclude" select="'documentId'"/>
                                        </xsl:call-template>
                                    </fn:map>
                                </xsl:for-each>
                            </fn:array>
                        </fn:map>
                    </xsl:for-each-group>
                </fn:array>
            </xsl:variable>

            <!-- Build the complete JSON structure for this index -->
            <xsl:variable name="index-json" as="element(fn:map)">
                <fn:map>
                    <fn:string key="id"><xsl:value-of select="$index-id"/></fn:string>
                    <xsl:call-template name="serialize-lang-text">
                        <xsl:with-param name="elements" select="idx:title"/>
                        <xsl:with-param name="key" select="'title'"/>
                    </xsl:call-template>
                    <xsl:call-template name="serialize-lang-text">
                        <xsl:with-param name="elements" select="idx:description"/>
                        <xsl:with-param name="key" select="'description'"/>
                    </xsl:call-template>
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
                            <xsl:call-template name="serialize-lang-text">
                                <xsl:with-param name="elements" select="idx:title"/>
                                <xsl:with-param name="key" select="'title'"/>
                            </xsl:call-template>
                            <xsl:call-template name="serialize-lang-text">
                                <xsl:with-param name="elements" select="idx:description"/>
                                <xsl:with-param name="key" select="'description'"/>
                            </xsl:call-template>
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
