@if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

:: ----------------------
:: KUDU Deployment Script for Static Website
:: ----------------------

:: Setup
setlocal enabledelayedexpansion

:: 1. KuduSync - Copy build files from source to target
echo Syncing build files to deployment target...
call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%\build" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd;node_modules"
IF !ERRORLEVEL! NEQ 0 goto error

:: 2. Copy web.config to deployment target
echo Copying web.config to deployment target...
call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\web.config" "%DEPLOYMENT_TARGET%\web.config"
IF !ERRORLEVEL! NEQ 0 goto error

:: Finished successfully
echo Static website deployment completed successfully.
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
