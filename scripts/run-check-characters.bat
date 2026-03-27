@echo off
setlocal
cd /d "%~dp0.."

echo [1/2] Checking characters.js syntax...
node --check "characters.js"
if errorlevel 1 goto fail

echo [2/2] Validating character data...
node "scripts\validate-characters.js"
if errorlevel 1 goto fail

echo.
echo Character checks completed successfully.
pause
exit /b 0

:fail
echo.
echo Character checks failed. See messages above.
pause
exit /b 1
