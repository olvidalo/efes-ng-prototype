<?xml version="1.0" encoding="UTF-8"?>
<!--
  EpiDoc-to-HTML wrapper.

  Imports the project's start-edition.xsl, receives EpiDoc params as
  stylesheet params, tunnels them to the body-structure template, and
  optionally applies i18n replacement if a language param is provided.

  Each project scaffolds its own copy with the correct import path
  and body-structure template call. All param values come from the
  pipeline config — no defaults here.
-->
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:i18n="http://apache.org/cocoon/i18n/2.1"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="i18n xs">

    <xsl:import href="../sigidoc/start-edition.xsl"/>
    <xsl:import href="../overrides.xsl"/>

    <xsl:output method="xml" encoding="UTF-8" indent="no"/>

    <!-- EpiDoc params — values must be provided by pipeline config.
         The wrapper bridges these to parm-* tunnel params internally. -->
    <xsl:param name="edn-structure"/>
    <xsl:param name="edition-type"/>
    <xsl:param name="external-app-style"/>
    <xsl:param name="internal-app-style"/>
    <xsl:param name="leiden-style"/>
    <xsl:param name="line-inc"/>
    <xsl:param name="verse-lines"/>
    <xsl:param name="hgv-gloss"/>
    <xsl:param name="css-loc"/>
    <xsl:param name="image-loc"/>
    <xsl:param name="bib"/>
    <xsl:param name="bibloc"/>
    <xsl:param name="bib-link-template" select="()"/>
    <xsl:param name="authority-dir" select="''"/>
    <xsl:param name="symbols-file" select="''"/>
    <xsl:param name="places-file" select="''"/>
    <xsl:param name="institutions-file" select="''"/>
    <xsl:param name="glyph-variant" select="''"/>

    <!-- If set, translations are loaded and i18n:text elements replaced. -->
    <xsl:param name="language" select="''"/>

    <xsl:variable name="messages"
        select="if ($language != '')
                then doc(concat('../../translations/messages_', $language, '.xml'))
                else ()"/>

    <xsl:key name="message-by-key" match="message" use="@key"/>

    <xsl:template match="/">
        <xsl:variable name="body-output">
            <xsl:call-template name="sigidoc-body-structure">
                <xsl:with-param name="parm-edn-structure" select="$edn-structure" tunnel="yes"/>
                <xsl:with-param name="parm-edition-type" select="$edition-type" tunnel="yes"/>
                <xsl:with-param name="parm-external-app-style" select="$external-app-style" tunnel="yes"/>
                <xsl:with-param name="parm-internal-app-style" select="$internal-app-style" tunnel="yes"/>
                <xsl:with-param name="parm-leiden-style" select="$leiden-style" tunnel="yes"/>
                <xsl:with-param name="parm-line-inc" select="$line-inc" tunnel="yes" as="xs:double"/>
                <xsl:with-param name="parm-verse-lines" select="$verse-lines" tunnel="yes"/>
                <xsl:with-param name="parm-hgv-gloss" select="$hgv-gloss" tunnel="yes"/>
                <xsl:with-param name="parm-css-loc" select="$css-loc" tunnel="yes"/>
                <xsl:with-param name="parm-image-loc" select="$image-loc" tunnel="yes"/>
                <xsl:with-param name="parm-bib" select="$bib" tunnel="yes"/>
                <xsl:with-param name="parm-bibloc" select="$bibloc" tunnel="yes"/>
                <xsl:with-param name="parm-bib-link-template" select="$bib-link-template" tunnel="yes"/>
                <xsl:with-param name="parm-authority-dir" select="$authority-dir" tunnel="yes"/>
                <xsl:with-param name="parm-symbols-file" select="$symbols-file" tunnel="yes"/>
                <xsl:with-param name="parm-places-file" select="$places-file" tunnel="yes"/>
                <xsl:with-param name="parm-institutions-file" select="$institutions-file" tunnel="yes"/>
                <xsl:with-param name="parm-glyph-variant" select="$glyph-variant" tunnel="yes"/>
            </xsl:call-template>
        </xsl:variable>

        <xsl:choose>
            <xsl:when test="$messages">
                <xsl:apply-templates select="$body-output" mode="i18n-replace"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy-of select="$body-output"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- i18n: identity transform -->
    <xsl:template match="node() | @*" mode="i18n-replace">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()" mode="i18n-replace"/>
        </xsl:copy>
    </xsl:template>

    <!-- i18n: replace i18n:text elements with translations -->
    <xsl:template match="i18n:text[@i18n:key]" mode="i18n-replace">
        <xsl:variable name="key" select="@i18n:key"/>
        <xsl:variable name="translation" select="key('message-by-key', $key, $messages)[1]"/>
        <xsl:choose>
            <xsl:when test="$translation">
                <xsl:value-of select="$translation"/>
            </xsl:when>
            <xsl:when test="normalize-space(.)">
                <xsl:value-of select="."/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>[</xsl:text>
                <xsl:value-of select="$key"/>
                <xsl:text>]</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>
