@REM ----------------------------------------------------------------------------
@REM Maven start up batch script for Windows
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0__%"=="" SET __MVNW_ARG0__=%~f0
@SET __MVNW_CMD__=
@SET __MVNW_ERROR__=
@SET __MVNW_PSMODULEP_SAVE=%PSModulePath%
@SET PSModulePath=

@FOR /F "usebackq tokens=1* delims==" %%A IN ("%~dp0.mvn\wrapper\maven-wrapper.properties") DO @(
    IF "%%A"=="wrapperUrl" SET __MVNW_WRAPPERURL__=%%B
    IF "%%A"=="distributionUrl" SET __MVNW_DISTURL__=%%B
)

@SET PSModulePath=%__MVNW_PSMODULEP_SAVE%
@SET __MVNW_PSMODULEP_SAVE=
@SET __MVNW_WRAPPERJAR__="%~dp0.mvn\wrapper\maven-wrapper.jar"

@IF NOT EXIST %__MVNW_WRAPPERJAR__% (
    @ECHO Downloading Maven Wrapper...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%__MVNW_WRAPPERURL__%' -OutFile %__MVNW_WRAPPERJAR__%}"
    IF %ERRORLEVEL% NEQ 0 (
        @ECHO Error: Failed to download Maven Wrapper jar.
        EXIT /B 1
    )
)

@SET MAVEN_PROJECTBASEDIR=%~dp0
@IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%
@SET MAVEN_OPTS=-Xmx512m

java %MAVEN_OPTS% "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" -classpath %__MVNW_WRAPPERJAR__% org.apache.maven.wrapper.MavenWrapperMain %*
IF %ERRORLEVEL% NEQ 0 GOTO error
GOTO end

:error
SET ERROR_CODE=1

:end
@ENDLOCAL & SET ERROR_CODE=%ERROR_CODE%
EXIT /B %ERROR_CODE%
