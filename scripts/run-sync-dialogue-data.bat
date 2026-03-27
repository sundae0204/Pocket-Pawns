@echo off
setlocal
cd /d "%~dp0.."

echo Syncing dialogueData.json -> dialogueData.js ...
node "scripts\sync-dialogue-data.js"
if errorlevel 1 goto fail

echo.
echo Dialogue sync completed successfully.
pause
exit /b 0

:fail
echo.
echo Dialogue sync failed. See messages above.
pause
exit /b 1
