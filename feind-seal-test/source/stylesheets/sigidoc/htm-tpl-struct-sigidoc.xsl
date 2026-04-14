<?xml version="1.0" encoding="UTF-8"?><!-- $Id$ --><xsl:stylesheet xmlns:i18n="http://apache.org/cocoon/i18n/2.1"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:t="http://www.tei-c.org/ns/1.0" exclude-result-prefixes="t" version="2.0"
                xmlns:fn="http://www.w3.org/2005/xpath-functions">
  <!-- Contains named templates for IOSPE file structure (aka "metadata" aka "supporting data") -->

  <!-- Called from htm-tpl-structure.xsl -->
  
  <!-- LAST MODIFIED: 2024-08-09 -->

  <xsl:template name="sigidoc-body-structure">
    <xsl:call-template name="navigation"/>
    

      <h6 width="600" align="right" xml:space="preserve">SigiDoc ID: 
        <xsl:choose>
          <xsl:when test="//t:publicationStmt//t:idno[@type='SigiDocID']//text()">
            <xsl:apply-templates select="//t:publicationStmt//t:idno[@type='SigiDocID']"/>
          </xsl:when>
          <xsl:otherwise>―</xsl:otherwise>
        </xsl:choose>
      </h6>
    
    
    <div id="stone">
      <h3 class="iospe"><i18n:text i18n:key="artifact"/></h3>
      <dl class="iospe">
        <dt width="150" align="left"><i18n:text i18n:key="type"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:objectType//t:term//t:seg//text()">
              <xsl:apply-templates select="//t:objectType//t:term//t:seg"/>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
          <xsl:if test="//t:objectType//t:term//t:seg/@cert='low'">?</xsl:if>
        </dd>
        <!--MF deleted General Layout-->
        <dt width="150" align="left"><i18n:text i18n:key="matrix"/></dt>
        <dd>
          <xsl:choose xml:space="preserve">      
            <xsl:when test="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']"> 
              <xsl:choose>
                <xsl:when test="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc'] and //t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']">
                  SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']"/>* - PBW ID: <xsl:apply-templates select="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']"/>*
                </xsl:when>
                <xsl:when test="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']">
                  SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']"/>*
                </xsl:when>
                <xsl:when test="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']">
                  PBW ID: <xsl:apply-templates select="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']"/>*
                </xsl:when>
              </xsl:choose>
            </xsl:when>
            <xsl:when test="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']">
              <xsl:choose>
                <xsl:when test="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc'] and //t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']">
                  SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']"/> - PBW ID: <xsl:apply-templates select="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']"/>
                </xsl:when>
                <xsl:when test="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']">
                  SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']"/>
                </xsl:when>
                <xsl:when test="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']">
                  PBW ID: <xsl:apply-templates select="//t:layout[@n='whole']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']"/>
                </xsl:when>
              </xsl:choose>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
      </dl>
    </div>
        <div id="stone">
          <h4 class="iospe"><i18n:text i18n:key="physical-description"/></h4>
          <!-- ************* physical description *************** -->
          <dl class="iospe">
            <dt width="150" align="left"><i18n:text i18n:key="medium"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:objectType//t:interp[@type='workType']//text()">
              <xsl:apply-templates select="//t:objectType//t:interp[@type='workType']"/>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
          <xsl:if test="//t:objectType//t:interp[@type='workType']/@cert='low'">?</xsl:if>
        </dd>
            <dt width="150" align="left"><i18n:text i18n:key="material"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:support//t:material//t:seg//text()">
              <xsl:apply-templates select="//t:support//t:material//t:seg"/>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
          <xsl:if test="//t:support//t:material//t:seg/@cert='low'">?</xsl:if>
        </dd>
            <dt width="150" align="left"><i18n:text i18n:key="shape"/></dt>
            <dd>
              <xsl:choose>
                <xsl:when test="//t:layout//t:rs[@type='shape']//t:seg//text()">
                  <xsl:apply-templates select="//t:layout//t:rs[@type='shape']//t:seg"/>
                </xsl:when>
                <xsl:otherwise>―</xsl:otherwise>
              </xsl:choose>
              <xsl:if test="//t:layout//t:rs[@type='shape']//t:seg/@cert='low'">?</xsl:if>
            </dd>
            <dt width="150" align="left"><i18n:text i18n:key="dimensions"/></dt>
        <dd>
          <xsl:choose xml:space="preserve">
            <xsl:when test="//t:support/t:dimensions/t:dim[@type='diameter']/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="diameter"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:dim[@type='diameter']"/>
              <xsl:if test="//t:support/t:dimensions/t:dim[@type='diameter']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:when test="//t:support/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:support/t:dimensions/t:width/text()[not(normalize-space(.)=' ')] and //t:support/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="height"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:height"/>
              <xsl:if test="//t:support/t:dimensions/t:height/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="width"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:width"/>
              <xsl:if test="//t:support/t:dimensions/t:width/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="thickness"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:depth"/>
              <xsl:if test="//t:support/t:dimensions/t:depth/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:when test="//t:support/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:support/t:dimensions/t:width/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="height"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:height"/>
              <xsl:if test="//t:support/t:dimensions/t:height/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="width"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:width"/>
              <xsl:if test="//t:support/t:dimensions/t:width/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:when test="//t:support/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:support/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="height"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:height"/>
              
              <xsl:if test="//t:support/t:dimensions/t:height/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="thickness"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:depth"/>
              <xsl:if test="//t:support/t:dimensions/t:depth/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:when test="//t:support/t:dimensions/t:width/text()[not(normalize-space(.)=' ')] and //t:support/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="width"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:width"/>
              <xsl:if test="//t:support/t:dimensions/t:width/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="thickness"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:depth"/>
              <xsl:if test="//t:support/t:dimensions/t:depth/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:when test="//t:support/t:dimensions/t:height/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="height">/</i18n:text>
              <xsl:apply-templates select="//t:support/t:dimensions/t:height"/>
              <xsl:if test="//t:support/t:dimensions/t:height/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:when test="//t:support/t:dimensions/t:width/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="width"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:width"/>
              <xsl:if test="//t:support/t:dimensions/t:width/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:when test="//t:support/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="thickness"/>
              <xsl:apply-templates select="//t:support/t:dimensions/t:depth"/>
              <xsl:if test="//t:support/t:dimensions/t:depth/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
            <dt width="150" align="left"><i18n:text i18n:key="weight"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:support//t:measure[@type='weight'][@unit='g']//text()">
              <xsl:apply-templates select="//t:support//t:measure[@type='weight'][@unit='g']"/>
              <xsl:if test="//t:support//t:measure[@type='weight'][@unit='g']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
          
        </dd>
            <dt width="150" align="left"><i18n:text i18n:key="channel-orientation"/></dt>
            <dd>
              <xsl:choose>
                <xsl:when test="//t:support//t:measure[@type='channelOrient'][@unit='clock']//text()">
                  <xsl:apply-templates select="//t:support//t:measure[@type='channelOrient'][@unit='clock']"/>
                  <xsl:if test="//t:support//t:measure[@type='channelOrient'][@unit='clock']/@cert='low'">?</xsl:if>
                </xsl:when>
                <xsl:otherwise>―</xsl:otherwise>
              </xsl:choose>
            </dd>
            <dt width="150" align="left"><i18n:text i18n:key="axis"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:support//t:measure[@type='axis'][@unit='clock']//text()">
              <xsl:apply-templates select="//t:support//t:measure[@type='axis'][@unit='clock']"/>
              <xsl:if test="//t:support//t:measure[@type='axis'][@unit='clock']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
            <dt width="150" align="left"><i18n:text i18n:key="overstrike-orientation"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:support//t:measure[@type='overstrikeOrient'][@unit='clock']//text()">
              <xsl:apply-templates select="//t:support//t:measure[@type='overstrikeOrient'][@unit='clock']"/>
              <xsl:if test="//t:support//t:measure[@type='overstrikeOrient'][@unit='clock']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
            <dt width="150" align="left"><i18n:text i18n:key="execution"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:layout//t:rs[@type='execution']//t:seg//text()">
              <xsl:apply-templates select="//t:layout//t:rs[@type='execution']//t:seg"/>
            <!--  <xsl:if test="//t:layout//t:rs[@type='execution']//t:seg/@cert='low'">?</xsl:if> -->
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
            <dt width="150" align="left"><i18n:text i18n:key="countermark"/></dt>
            <dd>
              <xsl:choose>
                <xsl:when test="//t:support//t:measure[@type='countermark']//text()">
                  <xsl:apply-templates select="//t:support//t:measure[@type='countermark']"/>
                  <xsl:if test="//t:support//t:measure[@type='countermark']/@cert='low'">?</xsl:if>
                </xsl:when>
                <xsl:otherwise>―</xsl:otherwise>
              </xsl:choose>
            </dd>
            <dt width="150" align="left"><i18n:text i18n:key="condition"/></dt>
        <dd>
          <xsl:choose xml:space="preserve">
            <xsl:when test="//t:supportDesc//t:condition/t:p/text()">
              <xsl:apply-templates select="//t:supportDesc//t:condition//t:p//text()"/>
                  <xsl:if test="//t:supportDesc//t:condition//t:p/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
          </dl>
        </div>
        <div id="stone">
          <h4 class="iospe"><i><i18n:text i18n:key="dating"/></i></h4><!-- ***********Dating************ -->
        <dl class="iospe">
          <dt width="150" align="left"><i18n:text i18n:key="date"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:origin//t:origDate[@type='analysis']//t:seg/text()">
              <xsl:apply-templates select="//t:origin//t:origDate[@type='analysis']//t:seg"/>
              <xsl:if test="//t:origin//t:origDate[@type='analysis']//t:seg/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
          <dt width="150" align="left"><i18n:text i18n:key="internal-date"/></dt>
          <dd>
            <xsl:choose>
              <xsl:when test="//t:origin//t:origDate[@type='internal']//t:seg/text()">
                <xsl:apply-templates select="//t:origin//t:origDate[@type='internal']//t:seg"/>
                <xsl:if test="//t:origin//t:origDate[@type='internal']//t:seg/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="dating-criteria"/></dt>
        <dd>
          
           <xsl:choose>
            <xsl:when test="//t:origin/t:origDate/@evidence">
              <xsl:for-each select="tokenize(//t:origin/t:origDate/@evidence,' ')">
                <i18n:text i18n:key="{.}"/>
          
                
                <xsl:if test="position()!=last()">
                  <xsl:text>, </xsl:text>
                </xsl:if>
                
              </xsl:for-each>
            </xsl:when>
            <xsl:otherwise>
              <i18n:text i18n:key="not-specified"/>
            </xsl:otherwise>
            </xsl:choose> 
        </dd>
          <dt width="150" align="left"><i18n:text i18n:key="alternative-dating"/></dt>
          <dd>
            <xsl:choose>
              <xsl:when test="//t:origin//t:date//t:choice">
                <xsl:apply-templates select="//t:origin//t:date//t:choice//t:corr"/> (<xsl:apply-templates select="//t:origin//t:date//t:choice//t:corr/@resp"/>), <i18n:text i18n:key="alternative-dating-basedon"/>: <xsl:apply-templates select="//t:origin//t:date//t:interp[@type='datingCriteria']"/>)
                <xsl:if test="//t:origin//t:date//t:choice//t:corr/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
        </dl>
        </div>
        <div id="stone">
          <h4 class="iospe"><i><i18n:text i18n:key="history"/></i></h4><!-- ***********History********* -->
        <dl class="iospe">
          <dt width="150" align="left"><i18n:text i18n:key="seal-category"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:msContents//t:summary[@n='whole']//t:seg//text()">
              <xsl:apply-templates select="//t:msContents//t:summary[@n='whole']//t:seg"/>
              <xsl:if test="//t:msContents//t:summary[@n='whole']//t:seg/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
          <dt width="150" align="left"><i18n:text i18n:key="issuer"/></dt>
        <dd>
          
          <xsl:for-each select="//t:listPerson[@type='issuer']//t:person">
            <xsl:variable name="forename">
              <xsl:value-of select="./t:persName/t:forename"/>
              <xsl:if test="./t:persName/t:forename/@cert='low'">?</xsl:if>
           </xsl:variable>
            <xsl:variable name="surname">           
              <xsl:value-of select="./t:persName/t:surname"/>
            <xsl:if test="./t:persName/t:surname/@cert='low'">?</xsl:if>
            </xsl:variable>
            <xsl:variable name="idnos">
              <xsl:for-each select="./t:idno">
                <xsl:if test=". != ''">
                  <xsl:value-of select="./@type"/>: <a href="{./@ana}"><xsl:value-of select="."/>
                  </a><xsl:if test="not(position() = last())">; </xsl:if>
                </xsl:if>
              </xsl:for-each>
            </xsl:variable>
            <xsl:value-of select="concat($forename,' ' ,$surname)"/>
            <xsl:if test="$idnos != ''">(<xsl:copy-of select="$idnos"/>)</xsl:if>
            <br/>
            <b><i18n:text i18n:key="facet-milieu"></i18n:text>: </b>
            <xsl:variable name="tokenizedmillieu">
              <xsl:for-each select="tokenize(./@role, ' ')">
                <token>
                  <xsl:value-of select="."/>
                </token>
              </xsl:for-each>
            </xsl:variable>
            <xsl:for-each select="$tokenizedmillieu//token">
              <i18n:text i18n:key="{.}"/><xsl:if test="not(fn:position() =last())">; </xsl:if>
            </xsl:for-each>
            <br/><b><i18n:text i18n:key="facet-gender"/>: </b>
            <xsl:choose>
              <xsl:when test="./@gender != ''"><i18n:text i18n:key="{./@gender}"/><br/></xsl:when>
              <xsl:otherwise>-</xsl:otherwise>
            </xsl:choose>
       
         </xsl:for-each>

        </dd>
          <!--
          <dt width="150" align="left"><i18n:text i18n:key="issuer-milieu"/></dt>
          <dd>
            <xsl:for-each select=".//t:person">
              
            </xsl:for-each>
            <xsl:choose>
            <xsl:when test="//t:person/@role[ancestor::t:listPerson]">
              <xsl:for-each select="tokenize(translate(//t:person/@role, ' ', ','), ',')">
                <xsl:variable name="currentToken">
                  <xsl:choose>
                    <xsl:when test=". = 'secular-church'">
                      <xsl:value-of select="'secular Church'"/>
                    </xsl:when>
                    <xsl:otherwise>
                      <xsl:value-of select="normalize-space(.)"/>
                    </xsl:otherwise>
                  </xsl:choose>
                </xsl:variable>
                <xsl:choose>
                  <xsl:when test="position() = 1">
                    <xsl:value-of select="concat(upper-case(substring($currentToken, 1, 1)), substring($currentToken, 2))"/>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:value-of select="$currentToken"/>
                  </xsl:otherwise>
                </xsl:choose>
                <xsl:if test="position() != last()">
                  <xsl:text>, </xsl:text>
                </xsl:if>
              </xsl:for-each>
            </xsl:when>
            <xsl:when test="//t:org/@role and //t:org/@type">
              <xsl:value-of select="concat(//t:org/@role, ', ')"/>
              <xsl:for-each select="tokenize(translate(//t:org/@type, ' ', ','), ',')">
                <xsl:variable name="currentToken">
                  <xsl:choose>
                    <xsl:when test=". = 'secular-church'">
                      <xsl:value-of select="'secular Church'"/>
                    </xsl:when>
                    <xsl:otherwise>
                      <xsl:value-of select="normalize-space(.)"/>
                    </xsl:otherwise>
                  </xsl:choose>
                </xsl:variable>
                <xsl:choose>
                  <xsl:when test="position() = 1">
                    <xsl:value-of select="concat(upper-case(substring($currentToken, 1, 1)), substring($currentToken, 2))"/>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:value-of select="$currentToken"/>
                  </xsl:otherwise>
                </xsl:choose>
                <xsl:if test="position() != last()">
                  <xsl:text>, </xsl:text>
                </xsl:if>
              </xsl:for-each>
            </xsl:when>
          </xsl:choose></dd>
          -->
          <dt width="150" align="left"><i18n:text i18n:key="place-origin"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:origPlace//t:seg//t:placeName//text()">
              <xsl:apply-templates select="//t:origPlace//t:seg//t:placeName"/>
              <xsl:if test=".//t:origPlace//t:seg//t:placeName/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
          <dt width="150" align="left"><i18n:text i18n:key="find-place"/></dt>
        <dd>
          <xsl:choose xml:space="preserve">
            <xsl:when test="//t:history//t:provenance[@type='found']//t:placeName[@type='ancientFindspot']//text() and //t:history//t:provenance[@type='found']//t:placeName[@type='modernFindspot']//text()">
              <xsl:apply-templates select="//t:history//t:provenance[@type='found']//t:placeName[@type='ancientFindspot']"/>
              <xsl:if test="//t:history//t:provenance[@type='found']//t:placeName[@type='ancientFindspot']/@cert='low'">?</xsl:if>
              (<xsl:apply-templates select="//t:history//t:provenance[@type='found']//t:placeName[@type='modernFindspot']"/>)
            </xsl:when>
            <xsl:when test="//t:history//t:provenance[@type='found']//t:placeName[@type='ancientFindspot']//text()">
              <xsl:apply-templates select="//t:history//t:provenance[@type='found']//t:placeName[@type='ancientFindspot']"/>
              <xsl:if test="//t:history//t:provenance[@type='found']//t:placeName[@type='ancientFindspot']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:when test="//t:history//t:provenance[@type='found']//t:placeName[@type='modernFindspot']//text()">
              <xsl:apply-templates select="//t:history//t:provenance[@type='found']//t:placeName[@type='modernFindspot']"/>
              <xsl:if test="//t:history//t:provenance[@type='found']//t:placeName[@type='modernFindspot']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
          <dt width="150" align="left"><i18n:text i18n:key="find-date"/></dt>
          <dd>
            <xsl:choose xml:space="preserve">
              <xsl:when test="//t:provenance[@type='found']/@when">
                <xsl:apply-templates select="//t:provenance[@type='found']/@when"/>
              </xsl:when>
              <xsl:when test="//t:provenance[@type='found']/@notBefore and //t:provenance[@type='found']/@notAfter">
                <xsl:apply-templates select="//t:provenance[@type='found']/@notBefore"/> - <xsl:apply-templates select="//t:provenance[@type='found']/@notAfter"/>
              </xsl:when>
              <xsl:when test="//t:provenance[@type='found']/@notBefore">
                <i18n:text i18n:key="not-before"/> <xsl:apply-templates select="//t:provenance[@type='found']/@notBefore"/>
              </xsl:when>
              <xsl:when test="//t:provenance[@type='found']/@notAfter">
                <i18n:text i18n:key="not-after"/> <xsl:apply-templates select="//t:provenance[@type='found']/@notAfter"/>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
            <xsl:if test="//t:provenance[@type='found']/@cert='low'">?</xsl:if>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="find-circumstances"/></dt>
          <dd>
          <xsl:choose>
            <xsl:when test="//t:provenance[@type='found']//t:rs[@type='circumstances']//text()">
              <xsl:apply-templates select="//t:provenance[@type='found']//t:rs[@type='circumstances']"/>
              <xsl:if test="//t:provenance[@type='found']//t:rs[@type='circumstances']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
          <dt width="150" align="left"><i18n:text i18n:key="modern-location"/></dt>
        <dd>
          <xsl:choose xml:space="preserve">
                        <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier//t:settlement//t:seg//text() and //t:sourceDesc//t:msDesc//t:msIdentifier//t:country//t:seg//text()">
                          <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier//t:settlement//t:seg"/>
                          <xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier//t:settlement//t:seg/@cert='low'">?</xsl:if>
                          (<xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier//t:country//t:seg"/><xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier//t:country//t:seg/@cert='low'">?</xsl:if>) 
                        </xsl:when>
                        <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier//t:settlement//t:seg//text()">
                          <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier//t:settlement//t:seg"/>
                          <xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier//t:settlement//t:seg/@cert='low'">?</xsl:if>
                          <xsl:text></xsl:text>
                        </xsl:when>
                        <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier//t:country//t:seg//text()">
                          <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier//t:country//t:seg"/>
                          <xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier//t:country//t:seg/@cert='low'">?</xsl:if>
                          <xsl:text></xsl:text>
                        </xsl:when>
                        <xsl:otherwise>―</xsl:otherwise>
                    </xsl:choose>
        </dd>
          <dt width="150" align="left"><i18n:text i18n:key="institution-repository"/></dt>
        <!-- <dd>
            <xsl:choose xml:space="preserve">
                        <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier">
                            <xsl:value-of select="//t:sourceDesc//t:msDesc//t:msIdentifier//t:institution"/>: <xsl:value-of select="//t:sourceDesc//t:msDesc//t:msIdentifier//t:repository"/>, <xsl:value-of select="//t:sourceDesc//t:msDesc//t:msIdentifier//t:collection"/>, No. <xsl:value-of select="//t:sourceDesc//t:msDesc//t:msIdentifier//t:idno"/>  
                        </xsl:when>
                        <xsl:otherwise><i18n:text i18n:key="not-available">Not available</i18n:text></xsl:otherwise>
                    </xsl:choose>
          </dd> -->
          <dd>
            <xsl:choose xml:space="preserve">
              <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:institution//text() and //t:sourceDesc//t:msDesc//t:msIdentifier/t:repository//text()">
                <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:institution"/><xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:institution/@cert='low'">?</xsl:if>,
                <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:repository"/><xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:repository/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:institution//text()">
              <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:institution"/>
                <xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:institution/@cert='low'">?</xsl:if>
              <xsl:text></xsl:text>
            </xsl:when>
              <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:repository/text()">
              <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:repository"/>
                <xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:repository/@cert='low'">?</xsl:if>
              <xsl:text></xsl:text>
            </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="collection-inventory"/></dt>
          <dd>
            <xsl:choose xml:space="preserve">
              <!-- if msIdentifier/collection has a text-node as descendent and there msIdentifier/idno with text-node as descendent
              write both in a row--> 
              <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection//text() and //t:sourceDesc//t:msDesc//t:msIdentifier/t:idno//text()">
               <xsl:choose>
                 <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/t:rs/@ref">
                    <a href="{//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/t:rs/@ref}">
                  <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/t:rs"/>
                </a>
                 </xsl:when>
                 <xsl:otherwise>
                   <span>
                    <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/t:rs"/>
                   </span>
                 </xsl:otherwise>
               </xsl:choose><xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/@cert='low'">?</xsl:if>
                <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:idno"/><xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:idno/@cert='low'">?</xsl:if>
              </xsl:when>
              <!-- if msIdentifier/collection has a text-node as descendent write it string no inv. no in a row--> 
              <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection//text()">
              <xsl:choose>
                <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/t:rs/@ref">
                  <a href="{//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/t:rs/@ref}">
                    <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection"/>
                  </a>
                </xsl:when>
                <xsl:otherwise>
                  <span>
                    <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection"/>
                  </span>
                </xsl:otherwise>
              </xsl:choose>
                <xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/@cert='low'">?</xsl:if>
              <xsl:text>no inv. no.</xsl:text>
            </xsl:when>
              <!-- if there is only a msIdentifier/idno with a text-node write only this -->
              <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:idno//text()">
              <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:msIdentifier/t:idno"/>
                
                <xsl:if test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:collection/@cert='low'">?</xsl:if>
              <xsl:text></xsl:text>
            </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
            
            <xsl:choose xml:space="preserve">
              <!-- When msIdentifiert/altIdentifier/repository has a text node as child and msIdentifiert/altIdentifier/idno as text-node as child, w
              write (olim [repository] [idno] )-->
              <xsl:when test="//t:sourceDesc//t:msDesc//t:msIdentifier/t:altIdentifier/t:repository/text() and //t:sourceDesc//t:msDesc//t:msIdentifier/t:altIdentifier/t:idno//text()">
                 (<i>olim </i><xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:sourceDesc//t:msDesc//t:msIdentifier/t:altIdentifier/t:repository"/> <xsl:if test="//t:sourceDesc//t:msDesc//t:altIdentifier/t:repository/@cert='low'">?</xsl:if> 
                <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:sourceDesc//t:msDesc//t:msIdentifier/t:altIdentifier/t:idno"/><xsl:if test="//t:sourceDesc//t:msDesc//t:altIdentifier/t:idno/@cert='low'">?</xsl:if>)
              </xsl:when>
              
              <!-- When only msIdentifiert/altIdentifier/repository has a text node as child  w
              write (olim [repository] )-->
              <xsl:when test="//t:sourceDesc//t:msDesc//t:altIdentifier/t:repository/text()">
               (<i>olim </i><xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:altIdentifier/t:repository"/><xsl:if test="//t:sourceDesc//t:msDesc//t:altIdentifier/t:repository/@cert='low'">?</xsl:if>)
            </xsl:when>
              
              <!-- When only msIdentifiert/altIdentifier/idno has a text node as child  w
              write only [idno] -->
              <xsl:when test="//t:sourceDesc//t:msDesc//t:altIdentifier/t:idno//text()">
                (<i>olim </i>
              <xsl:apply-templates select="//t:sourceDesc//t:msDesc//t:altIdentifier/t:idno"/><xsl:if test="//t:sourceDesc//t:msDesc//t:altIdentifier/t:idno/@cert='low'">?</xsl:if>)
                
            </xsl:when>
            </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="acquisition"/></dt>
          <dd>
            <xsl:choose xml:space="preserve">
              <xsl:when test="//t:acquisition//t:p//text()">
                <xsl:apply-templates select="//t:acquisition//t:p"/>
                <xsl:if test="//t:acquisition//t:p/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="previous-locations"/></dt>
          <dd>
            <xsl:choose xml:space="preserve">
              <xsl:when test="//t:provenance[@type='transferred']//t:p//text()">
                <xsl:apply-templates select="//t:provenance[@type='transferred']//t:p"/>
                <xsl:if test="//t:provenance[@type='transferred']//t:p/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="modern-observations"/></dt>
          <dd>
            <xsl:choose>
              <xsl:when test="//t:provenance[@type='observed']//t:p//text() and //t:provenance[@type='not-observed']//t:p//text()">
                <xsl:apply-templates select="//t:provenance[@type='observed']//t:p"/><xsl:if test="//t:provenance[@type='observed']//t:p/@cert='low'">?</xsl:if>
                <xsl:apply-templates select="//t:provenance[@type='not-observed']//t:p"/><xsl:if test="//t:provenance[@type='not-observed']//t:p/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:provenance[@type='observed']//t:p//text()">
                <xsl:apply-templates select="//t:provenance[@type='observed']//t:p"/><xsl:if test="//t:provenance[@type='observed']//t:p/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:provenance[@type='not-observed']//t:p//text()">
                <xsl:apply-templates select="//t:provenance[@type='not-observed']//t:p"/><xsl:if test="//t:provenance[@type='not-observed']//t:p/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
        </dl>
        </div>
        
      <div id="text-field">
        <h3 class="iospe"><i18n:text i18n:key="field-obverse"/></h3>
        <!-- *******inscribed field - obverse *********** -->
        <dl class="iospe"> 
          <dt width="150" align="left"><i18n:text i18n:key="languages"/></dt>
          <dd>
            <xsl:variable name="langcount" select="count(distinct-values(//t:div[@type='edition' and @subtype='editorial']/t:div[@type='textpart' and @n='obv']/@xml:lang))"/>
          
            <xsl:for-each select="distinct-values(//t:div[@type='edition' and @subtype='editorial']/t:div[@type='textpart' and @n='obv']/@xml:lang)">
                <xsl:variable name="lang" select="."/>
                  <i18n:text i18n:key="{$lang}"/>
              <xsl:if test="fn:position() &lt; $langcount">
                <xsl:text>; </xsl:text>
              </xsl:if>
            </xsl:for-each>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="layout-field"/></dt>
          <dd>
            <xsl:choose xml:space="preserve">
                        <xsl:when test="//t:layoutDesc//t:layout[@n='r']/t:p/text()">
                            <xsl:apply-templates select="//t:layoutDesc//t:layout[@n='r']/t:p/text()"/><xsl:if test="//t:layoutDesc//t:layout[@n='r']/t:p/@cert='low'">?</xsl:if>
                        </xsl:when>
                        <xsl:otherwise>―</xsl:otherwise>
                    </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="field-dimensions"/></dt>
          <dd>
            <xsl:choose xml:space="preserve">
            <xsl:when test="//t:layout[@n='r']/t:dimensions/t:dim[@type='diameter']/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="diameter"/>
              <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:dim[@type='diameter']"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:dim[@type='diameter']/@cert='low'">?</xsl:if>
            </xsl:when>
              <xsl:when test="//t:layout[@n='r']/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:layout[@n='r']/t:dimensions/t:width/text()[not(normalize-space(.)=' ')] and //t:layout[@n='r']/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="height"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:height"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:height/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="width"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:width"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:width/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="thickness"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:depth"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:depth/@cert='low'">?</xsl:if><!-- not necessary for field's dimensions, but still... -->
            </xsl:when>
              <xsl:when test="//t:layout[@n='r']/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:layout[@n='r']/t:dimensions/t:width/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="height"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:height"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:height/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="width"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:width"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:width/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='r']/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:layout[@n='r']/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="height"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:height"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:height/@cert='low'">?</xsl:if>,
                <i18n:text i18n:key="thickness"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:depth"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:depth/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='r']/t:dimensions/t:width/text()[not(normalize-space(.)=' ')] and //t:layout[@n='r']/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="width"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:width"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:width/@cert='low'">?</xsl:if>,
                <i18n:text i18n:key="thickness"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:depth"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:depth/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='r']/t:dimensions/t:height/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="height"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:height"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:height/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='r']/t:dimensions/t:width/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="width"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:width"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:width/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='r']/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="thickness"/>
                <xsl:apply-templates select="//t:layout[@n='r']/t:dimensions/t:depth"/><xsl:if test="//t:layout[@n='r']/t:dimensions/t:depth/@cert='low'">?</xsl:if>
              </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="matrix"/></dt>
          <dd>
            <xsl:choose xml:space="preserve">
              <xsl:when test="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']">
                <xsl:choose>
                  <xsl:when test="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc'] and //t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']">
                    SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']//text()"/>* - PBW ID: <xsl:apply-templates select="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']//text()"/>*
                  </xsl:when>
                  <xsl:when test="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']">
                SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']//text()"/>*
                  </xsl:when>
                  <xsl:when test="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']">
                PBW ID: <xsl:apply-templates select="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']//text()"/>*
                  </xsl:when>
                </xsl:choose>
              </xsl:when>
              <xsl:when test="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']">
                <xsl:choose xml:space="preserve">
                  <xsl:when test="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc'] and //t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']">
                    SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']//text()"/> - PBW ID: <xsl:apply-templates select="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']//text()"/>
                  </xsl:when>
                  <xsl:when test="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']">
                    SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']//text()"/>
                  </xsl:when>
                  <xsl:when test="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']">
                    PBW ID: <xsl:apply-templates select="//t:layout[@n='r']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']//text()"/>
                  </xsl:when>
                </xsl:choose>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="iconography"/></dt>
          <dd>
            <xsl:choose>
              <xsl:when test="//t:figure//t:figDesc[@n='r']//text()">
                <xsl:apply-templates select="//t:figure//t:figDesc[@n='r']"/><xsl:if test="//t:figure//t:figDesc[@n='r']/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="decoration"/></dt>
          <dd>
            <xsl:choose>
              <xsl:when test="//t:figure//t:figDesc[@n='decoR']//text()">
                <xsl:apply-templates select="//t:figure//t:figDesc[@n='decoR']"/><xsl:if test="//t:figure//t:figDesc[@n='decoR']/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
          <dt width="150" align="left"><i18n:text i18n:key="epigraphy"/></dt>
          <dd id="epigraphy">
            <xsl:choose> <!--cambiare @n='whole' in 'r' e 'v'-->
              <xsl:when test="//t:handDesc//t:handNote[@n='r']//t:seg//text()">
                <xsl:apply-templates select="//t:handDesc//t:handNote[@n='r']//t:seg"/><xsl:if test="//t:handDesc//t:handNote[@n='r']//t:seg/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </dd>
          <!-- dating for assembled seals not included yet -->
        </dl>
      </div>

    <dl class="iospe"></dl><!-- don't touch this! -->
      
    <div id="text-field">
      <h3 class="iospe"><i18n:text i18n:key="field-reverse"/></h3><!-- *******inscribed field - reverse *********** -->
      <dl class="iospe"> 
        <dt width="150" align="left"><i18n:text i18n:key="languages"/></dt>
        <dd>
          <xsl:variable name="langcount" select="count(distinct-values(//t:div[@type='edition' and @subtype='editorial']/t:div[@type='textpart' and @n='rev']/@xml:lang))"/>
          <xsl:for-each select="distinct-values(//t:div[@type='edition' and @subtype='editorial']/t:div[@type='textpart' and @n='rev']/@xml:lang)">
            <xsl:choose>
              <xsl:when test=". != ''">
                <xsl:variable name="lang" select="."/>
                <i18n:text i18n:key="{$lang}"/>
                
                <xsl:if test="fn:position() &lt; $langcount">
                  <xsl:text>; </xsl:text>
                </xsl:if>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
        </dd>
        <dt width="150" align="left"><i18n:text i18n:key="layout-field"/></dt>
        <dd>
          <xsl:choose xml:space="preserve">
                        <xsl:when test="//t:layoutDesc//t:layout[@n='v']/t:p/text()">
                            <xsl:apply-templates select="//t:layoutDesc//t:layout[@n='v']/t:p/text()"/><xsl:if test="//t:layoutDesc//t:layout[@n='v']/t:p/@cert='low'">?</xsl:if>
                        </xsl:when>
                        <xsl:otherwise>―</xsl:otherwise>
                    </xsl:choose>
        </dd>
        <dt width="150" align="left"><i18n:text i18n:key="field-dimensions"/></dt>
        <dd>
          <xsl:choose xml:space="preserve">
            <xsl:when test="//t:layout[@n='v']/t:dimensions/t:dim[@type='diameter']/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="diameter"/>
              <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:dim[@type='diameter']"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:dim[@type='diameter']/@cert='low'">?</xsl:if>
            </xsl:when>
              <xsl:when test="//t:layout[@n='v']/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:layout[@n='v']/t:dimensions/t:width/text()[not(normalize-space(.)=' ')] and //t:layout[@n='v']/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
              <i18n:text i18n:key="height"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:height"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:height[@type='diameter']/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="width"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:width"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:width[@type='diameter']/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="thickness"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:depth"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:depth[@type='diameter']/@cert='low'">?</xsl:if><!-- not necessary for field's dimensions, but still... -->
            </xsl:when>
              <xsl:when test="//t:layout[@n='v']/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:layout[@n='v']/t:dimensions/t:width/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="height"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:height"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:height[@type='diameter']/@cert='low'">?</xsl:if>,
              <i18n:text i18n:key="width"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:width"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:width[@type='diameter']/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='v']/t:dimensions/t:height/text()[not(normalize-space(.)=' ')] and //t:layout[@n='v']/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="height"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:height"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:height[@type='diameter']/@cert='low'">?</xsl:if>,
                <i18n:text i18n:key="thickness"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:depth"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:depth[@type='diameter']/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='v']/t:dimensions/t:width/text()[not(normalize-space(.)=' ')] and //t:layout[@n='v']/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="width"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:width"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:width[@type='diameter']/@cert='low'">?</xsl:if>,
                <i18n:text i18n:key="thickness"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:depth"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:depth[@type='diameter']/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='v']/t:dimensions/t:height/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="height"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:height"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:height[@type='diameter']/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='v']/t:dimensions/t:width/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="width"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:width"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:width[@type='diameter']/@cert='low'">?</xsl:if>
              </xsl:when>
              <xsl:when test="//t:layout[@n='v']/t:dimensions/t:depth/text()[not(normalize-space(.)=' ')]">
                <i18n:text i18n:key="thickness"/>
                <xsl:apply-templates select="//t:layout[@n='v']/t:dimensions/t:depth"/><xsl:if test="//t:layout[@n='v']/t:dimensions/t:depth[@type='diameter']/@cert='low'">?</xsl:if>
              </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
        <dt width="150" align="left"><i18n:text i18n:key="matrix"/></dt>
        <dd>
          <xsl:choose xml:space="preserve">
              <xsl:when test="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']">
                <xsl:choose>
                  <xsl:when test="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc'] and //t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']">
                    SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']//text()"/>* - PBW ID: <xsl:apply-templates select="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']//text()"/>*
                  </xsl:when>
                  <xsl:when test="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']">
                SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='SigiDoc']//text()"/>*
                  </xsl:when>
                  <xsl:when test="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']">
                PBW ID: <xsl:apply-templates select="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='surviving']//t:idno[@type='PBW']//text()"/>*
                  </xsl:when>
                </xsl:choose>
              </xsl:when>
              <xsl:when test="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']">
                <xsl:choose xml:space="preserve">
                  <xsl:when test="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc'] and //t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']">
                    SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']//text()"/> - PBW ID: <xsl:apply-templates select="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']//text()"/>
                  </xsl:when>
                  <xsl:when test="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']">
                    SigiDoc ID: <xsl:apply-templates select="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='SigiDoc']//text()"/>
                  </xsl:when>
                  <xsl:when test="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']">
                    PBW ID: <xsl:apply-templates select="//t:layout[@n='v']//t:rs[@type='matrix'][@subtype='not-surviving']//t:idno[@type='PBW']//text()"/>
                  </xsl:when>
                </xsl:choose>
              </xsl:when>
              <xsl:otherwise>―</xsl:otherwise>
            </xsl:choose>
        </dd>
        <dt width="150" align="left"><i18n:text i18n:key="iconography"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:figure//t:figDesc[@n='v']//text()">
              <xsl:apply-templates select="//t:figure//t:figDesc[@n='v']"/><xsl:if test="//t:figure//t:figDesc[@n='v']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
        <dt width="150" align="left"><i18n:text i18n:key="decoration"/></dt>
        <dd>
          <xsl:choose>
            <xsl:when test="//t:figure//t:figDesc[@n='decoV']//text()">
              <xsl:apply-templates select="//t:figure//t:figDesc[@n='decoV']"/><xsl:if test="//t:figure//t:figDesc[@n='decoV']/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
        <dt width="150" align="left"><i18n:text i18n:key="epigraphy"/></dt>
        <dd id="epigraphy">
          <xsl:choose>
            <xsl:when test="//t:handDesc//t:handNote[@n='v']//t:seg//text()">
              <xsl:apply-templates select="//t:handDesc//t:handNote[@n='v']//t:seg"/><xsl:if test="//t:handDesc//t:handNote[@n='v']//t:seg/@cert='low'">?</xsl:if>
            </xsl:when>
            <xsl:otherwise>―</xsl:otherwise>
          </xsl:choose>
        </dd>
        <!-- dating for assembled seals -->
      </dl>
    </div>
    <dl class="iospe"><!-- don't touch this! --></dl>
      <xsl:if test="//t:graphic[@type='photo']">
      <div id="images"><!-- ************************* IMAGES ************************************ -->
        <h4 class="iospe"><i><i18n:text i18n:key="images"/></i></h4>
        <dl class="box">
          <xsl:for-each select="//t:facsimile//t:surface[@n='r']//t:graphic[@type='photo']">
            <dd>
              <xsl:apply-templates select="."/>
            </dd>
          </xsl:for-each>
          <dt width="150">
            <xsl:value-of select="//t:facsimile//t:surface[@n='r']//t:graphic[@type='photo']//t:desc"/><xsl:if test="//t:facsimile//t:surface[@type='r']//t:graphic//t:desc/@cert='low'">?</xsl:if>
          </dt>
        </dl>
        <dl class="box">
          <xsl:for-each select="//t:facsimile//t:surface[@n='v']//t:graphic[@type='photo']">
            <dd>
              <xsl:apply-templates select="."/>
            </dd>
          </xsl:for-each>
          <dt width="150">
            <xsl:value-of select="//t:facsimile//t:surface[@n='v']//t:graphic[@type='photo']//t:desc"/>
          </dt>
        </dl>
      </div> 
      </xsl:if>
     
    <div class="RTIedition">
      <xsl:if test="//t:graphic[upper-case(@type)='RTI']">
        <span>
        <div class="rti">
          <h4 class="iospe">RTI</h4>
            <script>
            $(document).ready(function() {
            
            const url = $('.rti-switch').not('.hidden').data('url')
            createRTIViewer(url);
            
            $('.rti-switch').on("click", function(){
              $(".rti-switch").toggleClass("hidden");
              const url = $('.rti-switch').not('.hidden').data('url')
              createRTIViewer(url);
              
            });
            
            });
            
            
            
            function createRTIViewer(url){
            $('.openLime').remove();
            $('.rti').append($('<div></div>').addClass('openLime'));            
              createOpenLime(url);
            };
            
            function createOpenLime(url){
              const lime = new OpenLIME.Viewer('.openLime');
              
            
              const layer0 = new OpenLIME.Layer({
                label: 'test-image ptm',
                layout: 'image',
                type: 'rti',
                url: url,
                normals: false
              });
              lime.addLayer('seal0',layer0);
              
              
              OpenLIME.Skin.setUrl('/assets/openlime/skin/skin.svg');
              // Create an User Interface 
              const ui = new OpenLIME.UIBasic(lime);
              
              // Add zoomin and zoomout to the toolbar
              ui.actions.zoomin.display = true;
              ui.actions.zoomout.display = true;
              ui.actions.light.active = true;
              
              OpenLIME.HSH.minElevation = 0.2;
              
              class LightSpin {
              constructor(layer, secondsPerTurn = 20, height = 0.7) {
              this.layer = layer;
              this.setHeight(height);
              this.startTime = Date.now();
              this.secondsPerTurn = secondsPerTurn;
              this.spinning = true;
              this.angle = 0.0;
              this.startAngle = 0.0;
              }
              setHeight(height) {
              this.w = Math.sqrt(1 + height*height);
              }
              update() {
              let seconds = (Date.now() - this.startTime) / 1000;
              
              this.angle = 2*Math.PI*(seconds/this.secondsPerTurn) + this.startAngle;
              
              let x = Math.cos(this.angle)/this.w;
              let y = Math.sin(this.angle)/this.w;
              this.layer.setLight([x, y], 100);
              if(this.spinning)
              requestAnimationFrame(() => this.update());
              }
              start() {
              this.startTime = Date.now();
              this.spinning = true;
              this.update();
              }
              stop() {
              this.startTime = Date.now();
              this.startAngle = this.angle;
              this.spinning = false;
              }
              }
              
              
              let spinner = new LightSpin(layer0, 20);
              //spinner.start();
              lime.pointerManager.idleTime = 60;
              lime.pointerManager.onEvent( { 
              priority: 0,
              wentIdle: () => { spinner.start() }, 
              activeAgain: () => { spinner.stop()}
              });
              
              }
          </script>
          
        </div>
        <a class="rti-switch" data-url="{//t:facsimile//t:surface[@n='v']//t:graphic[upper-case(@type)='RTI'][1]/@url}">show obverse</a>
        <a class="rti-switch hidden" data-url="{//t:facsimile//t:surface[@n='r']//t:graphic[upper-case(@type)='RTI'][1]/@url}">show reverse</a>
        </span>
      </xsl:if>
      <span id="editionSpan">
      <h4 class="iospe"><i18n:text i18n:key="edition"/></h4>
      <div class="section-container tabs" data-section="tabs">
        <section>
          <p class="title" data-section-title="data-section-title"><a href="#"><i18n:text i18n:key="interpretive"/></a></p>
          <div class="content" id="edition" data-section-content="data-section-content">
            <!-- Edited text output -->
            <xsl:variable name="edtxt">
              <xsl:apply-templates select="//t:div[@type='edition'][@subtype='editorial']">
                <xsl:with-param name="parm-edition-type" select="'interpretive'" tunnel="yes"/>
              </xsl:apply-templates>
            </xsl:variable>
            <!-- Moded templates found in htm-tpl-sqbrackets.xsl -->
            <xsl:apply-templates select="$edtxt" mode="sqbrackets"/>
          </div>
        </section>
        <section>
          <p class="title" data-section-title="data-section-title"><a href="#"><i18n:text i18n:key="diplomatic"/></a></p>
          <div class="content" id="diplomatic" data-section-content="data-section-content">
            <!-- Edited text output -->
            <xsl:variable name="edtxt">
              <xsl:apply-templates select="//t:div[@type='edition'][@subtype='diplomatic']">
                <xsl:with-param name="parm-edition-type" select="'diplomatic'" tunnel="yes"/>
              </xsl:apply-templates>
            </xsl:variable>
            <!-- Moded templates found in htm-tpl-sqbrackets.xsl -->
            <xsl:apply-templates select="$edtxt" mode="sqbrackets"/>
          </div>
        </section>
      </div>
      <xsl:if test="normalize-space(string-join(//t:div[@type='apparatus']/t:listApp//t:app,'')) != ''">
        <div id="apparatus" class="iospe">
          <h4 class="iospe"><i18n:text i18n:key="apparatus"/></h4>
          <xsl:variable name="apptxt">
            <p><xsl:apply-templates select="//t:div[@type='apparatus']/t:listApp"/></p> 
          </xsl:variable>
  
          <!-- Moded templates found in htm-tpl-sqbrackets.xsl -->
          <xsl:apply-templates select="$apptxt" mode="sqbrackets"/>
        </div>
      </xsl:if>
      </span>
      
    </div>
      
      
      <xsl:if test="normalize-space(string-join(//t:div[@type='translation']//t:p,'')) != ''">
      <div id="translation">
        <h4 class="iospe"><i18n:text i18n:key="legend-translation"/></h4>
        <xsl:variable name="transtxt">
          <xsl:apply-templates select="//t:div[@type='translation']//t:p"/>
        </xsl:variable>
        <!-- Moded templates found in htm-tpl-sqbrackets.xsl -->
        <xsl:apply-templates select="$transtxt" mode="sqbrackets"/>
      </div>
      </xsl:if>
      
      <div id="bibliography">
        <h4 class="iospe"><i18n:text i18n:key="references"/></h4>
      <dl class="iospe">  
        <dt width="150" align="left"><i18n:text i18n:key="editions"/></dt>
        <dd id="biblioEditions">
          <xsl:choose>
            <xsl:when test="//t:body//t:div[@type='bibliography'][@subtype='edition']/t:p/node()">
              <xsl:apply-templates select="//t:body//t:div[@type='bibliography'][@subtype='edition']/t:p/node()"/>
            </xsl:when>
            <xsl:otherwise><i><i18n:text i18n:key="unpublished"/></i></xsl:otherwise>
          </xsl:choose>
        </dd>
        <dt width="150" align="left"><i18n:text i18n:key="parallels"/></dt>
        <dd id="biblioParallels">
          <xsl:choose>
            <xsl:when test="//t:body//t:div[@type='bibliography'][@subtype='parallels']/t:p/node()">
              <xsl:for-each select="//t:body//t:div[@type='bibliography'][@subtype='parallels']/t:p">
                <span>
              <xsl:apply-templates select="./node()"/>
                </span><br/>
              </xsl:for-each>
            </xsl:when>
            <xsl:otherwise><i><i18n:text i18n:key="no-parallels-known"/></i></xsl:otherwise>
          </xsl:choose>
        </dd>
        <dt width="150" align="left"><i18n:text i18n:key="further-references"/></dt>
        <dd id="biblioCommParallels">
          <xsl:choose> <!--da cambiare i subtype-->
            <xsl:when test="//t:body//t:div[@type='bibliography'][@subtype='discussion']/t:p/node()">
              <xsl:apply-templates select="//t:body//t:div[@type='bibliography'][@subtype='discussion']/t:p/node()"/>
            </xsl:when>
            <xsl:otherwise><i><i18n:text i18n:key="no-further-references"/></i></xsl:otherwise>
          </xsl:choose>
        </dd>
      </dl>
      </div>
      
      <xsl:if test="//t:div[@type='commentary'][@subtype='text']//t:p/text()">
        <div id="commentary">
          <h4 class="iospe"><i><i18n:text i18n:key="commentary"/></i></h4>
          <!-- Commentary text output -->
          <xsl:variable name="commtxt">
            <xsl:apply-templates select="//t:div[@type='commentary'][@subtype='text']//t:p"/>
          </xsl:variable>
          <!-- Moded templates found in htm-tpl-sqbrackets.xsl -->
          <xsl:apply-templates select="$commtxt" mode="sqbrackets"/>
        </div>
      </xsl:if>
      
      
      <!-- ************** FOOTNOTES ***************** -->
      <xsl:choose>
        <xsl:when test="//t:div[@type='commentary'][@subtype='footnotes']//t:p/text()">
          <div class="fnseparator"/>
          <div id="footnotes">
            <h4 class="iospe" id="notes">
              <i18n:text i18n:key="footnotes"/>
            </h4>
            <xsl:apply-templates select="//t:div[@type='commentary'][@subtype='footnotes']//t:p"/>
          </div>
        </xsl:when>
        <xsl:otherwise>
          <xsl:text/>
        </xsl:otherwise>
      </xsl:choose>
  </xsl:template>

  <xsl:template name="sigidoc-structure">
    <xsl:variable name="title">
      <xsl:call-template name="iospe-title"/>
    </xsl:variable>
    <html>
      <head>
        <title>
          <xsl:value-of select="$title"/>
        </title>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
        <!-- Found in htm-tpl-cssandscripts.xsl -->
        <xsl:call-template name="css-script"/>
      </head>
      <body>
        <h1>
          <xsl:value-of select="$title"/>
        </h1>
        <xsl:call-template name="iospe-body-structure"/>
      </body>
    </html>
  </xsl:template>

  <xsl:template name="sigidoc-title">
    <xsl:choose>
      <xsl:when test="//t:titleStmt/t:title/text() and matches(//t:idno[@type='filename'], '^\d\.\d{1,4}$')">
        <xsl:number value="substring-before(//t:idno[@type='filename'],'.')" format="I"/>
        <xsl:text> </xsl:text>
        <xsl:number value="substring-after(//t:idno[@type='filename'],'.')" format="1"/>
        <xsl:text>. </xsl:text>
        <xsl:if test="string(normalize-space(//t:origPlace[1]))"><xsl:value-of select="normalize-space(//t:origPlace[1])"/>
        <xsl:text>.&#xa0;</xsl:text></xsl:if>
        <xsl:value-of select="//t:titleStmt/t:title[child::text()][1]"/>
        <xsl:if test="not(//t:titleStmt/t:title[child::text()][1][child::t:origDate])">
          <xsl:text>,&#xa0;</xsl:text>
          <xsl:value-of select="//t:origDate[1]"/>
        </xsl:if>
      </xsl:when>
      <xsl:when test="//t:titleStmt/t:title/text()">
        <xsl:for-each select="//t:titleStmt/t:title//text()">
       <xsl:choose>
            <xsl:when test="./parent::t:hi">
              <i><xsl:value-of select="."/></i>
            </xsl:when>
            <xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
          </xsl:choose>
        </xsl:for-each>
      <!--  <xsl:value-of select="//t:titleStmt/t:title"/> -->
      </xsl:when>
      <xsl:when test="//t:sourceDesc//t:bibl/text()">
        <xsl:value-of select="//t:sourceDesc//t:bibl"/>
      </xsl:when>
      <xsl:when test="//t:idno[@type='filename']/text()">
        <xsl:value-of select="//t:idno[@type='filename']"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:text>EpiDoc example output, SigiDoc style</xsl:text>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
  <xsl:template match="t:placeName"><!-- don't add @mode!!! -->
    <xsl:choose>
      <xsl:when test="contains(@ref,'pleiades.stoa.org') or contains(@ref,'geonames.org') or contains(@ref,'slsgazetteer.org')">
        <a>
          <xsl:attribute name="href">
            <xsl:value-of select="@ref"/>
          </xsl:attribute>
          <xsl:attribute name="target">_blank</xsl:attribute>
          <xsl:apply-templates/>
        </a>
      </xsl:when>
      <xsl:otherwise>
        <xsl:apply-templates/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
  <!-- ATTENTION commented out by MS because this is now in the htm-teiref.xsl stylesheet since EpiDoc 3.9 -->
<!--  <xsl:template match="t:ref"><!-\- for external (not <placeName/>) and internal links -\->
    <a>
      <xsl:attribute name="href">
        <xsl:value-of select="@target"/>
      </xsl:attribute>
      <xsl:attribute name="target">_blank</xsl:attribute>
      <xsl:apply-templates/>
    </a>
  </xsl:template>-->
  
  <xsl:template match="t:idno[@type='PBW']"><!-- pointing to the boulloterion ID page on the PBW -->
    <a>
      <xsl:attribute name="href">
        <xsl:value-of select="@corresp"/>
      </xsl:attribute>
      <xsl:attribute name="target">_blank</xsl:attribute>
      <xsl:apply-templates/>
    </a>
  </xsl:template>
  
  <!-- ATTENTION commented out by MS because this is now in the htm-teibibl.xsl stylesheet since EpiDoc 3.9 -->
<!--  <xsl:template match="t:ptr[@target]">
    <xsl:variable name="bibl-ref" select="@target"/>
    <xsl:variable name="bibl" select="document(concat('file:',system-property('user.dir'),'/webapps/ROOT/content/xml/authority/bibliography.xml'))//t:bibl[@xml:id=$bibl-ref][not(@sameAs)]"/>
    <a>
      <xsl:attribute name="href">
        <xsl:text>../concordance/bibliography/</xsl:text>
        <xsl:value-of select="$bibl-ref"/>
        <xsl:text>.html</xsl:text>
      </xsl:attribute>
      <xsl:attribute name="target">_blank</xsl:attribute>
      <xsl:choose>
        <xsl:when test="$bibl//t:bibl[@type='abbrev']">
          <xsl:apply-templates select="$bibl//t:bibl[@type='abbrev'][1]"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:apply-templates select="$bibl"/>
        </xsl:otherwise>
      </xsl:choose>
    </a>
  </xsl:template>-->
  
  <!-- arrows pointing to previous/next seal: from "Cretan Inscriptions" project -->
  <xsl:template name="navigation">
    <xsl:if test="doc-available(concat('file:',system-property('user.dir'),'/all_seals.xml')) = fn:true()">
      <xsl:variable name="filename"><xsl:value-of select="//t:idno[@type='sequence']"/></xsl:variable>
      <xsl:variable name="list" select="document(concat('file:',system-property('user.dir'),'/all_seals.xml'))//t:list"/>
      <xsl:variable name="prev" select="$list/t:item[@sortKey=$filename]/preceding-sibling::t:item[1]/@n"/>
      <xsl:variable name="next" select="$list/t:item[@sortKey=$filename]/following-sibling::t:item[1]/@n"/>
      
      <div class="row">
        <div class="large-12 columns">
          <ul class="pagination left">
            <xsl:if test="$prev">
              <li class="arrow">
                <a>
                  <xsl:attribute name="href">
                    <xsl:text>./</xsl:text>
                    <xsl:value-of select="$prev"/>
                    <xsl:text>.html</xsl:text>
                  </xsl:attribute>
                  <i18n:text i18n:key="arrow-left"/>
                </a>
              </li>
            </xsl:if>
            
            <xsl:if test="$next">
              <li class="arrow">
                <a>
                  <xsl:attribute name="href">
                    <xsl:text>./</xsl:text>
                    <xsl:value-of select="$next"/>
                    <xsl:text>.html</xsl:text>
                  </xsl:attribute>
                  <i18n:text i18n:key="arrow-right"/>
                </a>
              </li>
            </xsl:if>
          </ul>
        </div>
      </div>
    </xsl:if>
  </xsl:template>
  
</xsl:stylesheet>