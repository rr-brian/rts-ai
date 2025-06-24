@if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

:: ----------------------
:: KUDU Deployment Script
:: ----------------------

:: Setup
setlocal enabledelayedexpansion

IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%.
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%ARTIFACTS%\wwwroot
)

IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%ARTIFACTS%\manifest
)

IF NOT DEFINED PREVIOUS_MANIFEST_PATH (
  SET PREVIOUS_MANIFEST_PATH=%ARTIFACTS%\manifest
)

IF NOT DEFINED KUDU_SYNC_CMD (
  :: Install kudu sync
  echo Installing Kudu Sync
  call npm install kudusync -g --silent
  IF !ERRORLEVEL! NEQ 0 goto error

  :: Locally just running "kuduSync" would also work
  SET KUDU_SYNC_CMD=kudusync
)

:: 1. Check if build directory exists
IF NOT EXIST "%DEPLOYMENT_SOURCE%\build" (
  echo Error: Build directory not found. Please run 'npm run build' locally before deploying.
  goto error
)

echo Using pre-built React app from build directory...

:: 2. KuduSync - Copy build files to deployment target
echo Syncing build files to deployment target...
call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%\build" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd;node_modules"
IF !ERRORLEVEL! NEQ 0 goto error

:: 3. Copy web.config to deployment target
echo Copying web.config to deployment target...
call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\web.config" "%DEPLOYMENT_TARGET%\web.config"
IF !ERRORLEVEL! NEQ 0 goto error

:: 4. Copy server.js and server directory to deployment target
echo Copying server.js and server directory to deployment target...
call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\server.js" "%DEPLOYMENT_TARGET%\server.js"
IF !ERRORLEVEL! NEQ 0 goto error

echo Copying server directory...
IF EXIST "%DEPLOYMENT_SOURCE%\server" (
  call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%\server"
  call :ExecuteCmd xcopy /Y /E "%DEPLOYMENT_SOURCE%\server\*" "%DEPLOYMENT_TARGET%\server\"
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 5. Create a package.json file in the deployment target
echo Creating package.json in the deployment target...
call :ExecuteCmd cd "%DEPLOYMENT_TARGET%"

echo { > package.json
echo   "name": "rts-ai", >> package.json
echo   "version": "1.0.0", >> package.json
echo   "description": "RTS AI Chatbot", >> package.json
echo   "main": "server.js", >> package.json
echo   "dependencies": { >> package.json
echo     "express": "^4.18.2", >> package.json
echo     "path": "^0.12.7", >> package.json
echo     "cors": "^2.8.5", >> package.json
echo     "dotenv": "^16.3.1", >> package.json
echo     "mssql": "^9.1.1", >> package.json
echo     "uuid": "^9.0.0" >> package.json
echo   }, >> package.json
echo   "engines": { >> package.json
echo     "node": "^20.0.0" >> package.json
echo   } >> package.json
echo } >> package.json

:: 6. Install all server dependencies
echo Installing all server dependencies...
call :ExecuteCmd npm install --production
IF !ERRORLEVEL! NEQ 0 goto error

:: Finished successfully
echo Deployment completed successfully.
goto end

:error
echo An error occurred during deployment.
exit /b 1

:end
echo Finished successfully.
exit /b 0

:: Execute command routine that will echo out when error
:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed executing '%_CMD_%' && exit /b 1
endlocal
goto :EOF
