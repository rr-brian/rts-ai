@echo off

echo Starting deployment...

:: Setup
setlocal enabledelayedexpansion

:: 1. KuduSync - Copy pre-built files from build directory
echo Syncing pre-built files to deployment target...
call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%\build" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd;node_modules"
IF !ERRORLEVEL! NEQ 0 goto error

:: 2. Copy server.js to deployment target
echo Copying server.js to deployment target...
copy "%DEPLOYMENT_SOURCE%\server.js" "%DEPLOYMENT_TARGET%\server.js"
IF !ERRORLEVEL! NEQ 0 goto error

:: 3. Copy web.config to deployment target
echo Copying web.config to deployment target...
copy "%DEPLOYMENT_SOURCE%\web.config" "%DEPLOYMENT_TARGET%\web.config"
IF !ERRORLEVEL! NEQ 0 goto error

:: 4. Copy package.json to deployment target
echo Copying package.json to deployment target...
copy "%DEPLOYMENT_SOURCE%\package.json" "%DEPLOYMENT_TARGET%\package.json"
IF !ERRORLEVEL! NEQ 0 goto error

:: 5. Install only express and path dependencies
echo Installing minimal server dependencies...
pushd "%DEPLOYMENT_TARGET%"
call npm install express path --no-optional
IF !ERRORLEVEL! NEQ 0 goto error
popd

echo Deployment completed successfully.
goto end

:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed executing %_CMD_% && exit /b 1
endlocal
exit /b 0

:error
echo An error occurred during deployment.
exit /b 1

:end
echo Finished successfully.
