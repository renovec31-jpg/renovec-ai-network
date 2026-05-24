@echo off
cd /d "%~dp0"
echo === RENOVEC deploy ===

git fetch origin
if errorlevel 1 goto fail

echo === Commit local changes first ===
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix: CCM exclusive route, layout hardening v6, orphan session signOut"
)

echo === Rebase on origin/main ===
git pull --rebase origin main
if errorlevel 1 (
  echo REBASE FAILED - resolve conflicts, then: git add -A ^&^& git rebase --continue
  pause
  exit /b 1
)

call npm run build
if errorlevel 1 (
  echo BUILD FAILED
  pause
  exit /b 1
)

git push origin main
if errorlevel 1 (
  echo PUSH FAILED - check git credentials
  pause
  exit /b 1
)

git log origin/main -1 --oneline
echo.
echo OK - wait 2 min for GitHub Pages then hard-refresh https://renovec.fr
pause
exit /b 0

:fail
echo FAILED
pause
exit /b 1
