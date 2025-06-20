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

:: 2. Install npm packages
IF EXIST "%DEPLOYMENT_TARGET%\package.json" (
  echo Installing npm packages...
  pushd "%DEPLOYMENT_TARGET%"
  
  :: Install dependencies
  call npm install
  IF !ERRORLEVEL! NEQ 0 goto error
  
  :: Build the app
  call npm run build
  IF !ERRORLEVEL! NEQ 0 goto error
  
  popd
)

goto end

:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
exit /b %ERRORLEVEL%

:error
echo An error has occurred during web site deployment.
exit /b 1

:end
echo Finished successfully.
