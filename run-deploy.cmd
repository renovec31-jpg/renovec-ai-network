@echo off
cd /d "%~dp0"
git fetch origin > deploy-out.txt 2>&1
echo === STATUS === >> deploy-out.txt
git status >> deploy-out.txt 2>&1
git pull --rebase origin main >> deploy-out.txt 2>&1
if errorlevel 1 goto fail
call npm run build >> deploy-out.txt 2>&1
if errorlevel 1 goto fail
git add -A >> deploy-out.txt 2>&1
git commit -m "fix: CCM exclusive route, layout hardening v6, orphan session signOut" >> deploy-out.txt 2>&1
git push origin main >> deploy-out.txt 2>&1
if errorlevel 1 goto fail
echo === SUCCESS === >> deploy-out.txt
git log origin/main -1 --oneline >> deploy-out.txt 2>&1
exit /b 0
:fail
echo === FAILED exit %errorlevel% === >> deploy-out.txt
exit /b 1
