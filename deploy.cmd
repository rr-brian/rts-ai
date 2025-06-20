@echo off
echo Starting deployment script...

:: Setup
setlocal enabledelayedexpansion

:: 1. KuduSync
IF /I "%IN_PLACE_DEPLOYMENT%" NEQ "1" (
  echo Running KuduSync...
  call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd"
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 2. Install npm packages with optimizations
IF EXIST "%DEPLOYMENT_TARGET%\package.json" (
  echo Installing npm packages (optimized)...
  pushd "%DEPLOYMENT_TARGET%"
  
  :: Use npm ci instead of npm install for faster installs
  call :ExecuteCmd npm ci --only=production --no-audit --prefer-offline
  IF !ERRORLEVEL! NEQ 0 goto error
  
  :: Build with optimizations
  echo Building React app with optimizations...
  set "CI=false"
  set "GENERATE_SOURCEMAP=false"
  call :ExecuteCmd npm run build
  IF !ERRORLEVEL! NEQ 0 goto error
  
  popd
)

echo Deployment completed successfully.
goto end

:: Execute command routine that will echo out when error
:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed exitCode=%ERRORLEVEL%, command=%_CMD_%
exit /b %ERRORLEVEL%

:error
echo An error has occurred during web site deployment.
exit /b 1

:end
echo Finished successfully.
