$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$flag = Join-Path $root '.cursor\DEPLOY_NOW.flag'
$log = Join-Path $PSScriptRoot 'deploy-hook.log'

if (-not (Test-Path $flag)) { exit 0 }

Remove-Item $flag -Force
Set-Location $root

"=== DEPLOY $(Get-Date -Format o) ===" | Set-Content $log

try {
  git fetch origin 2>&1 | Add-Content $log
  git pull --rebase origin main 2>&1 | Add-Content $log
  npm run build 2>&1 | Add-Content $log
  git add -A 2>&1 | Add-Content $log
  git commit -m "fix: CCM exclusive route, layout hardening v6, orphan session signOut" 2>&1 | Add-Content $log
  git push origin main 2>&1 | Add-Content $log
  git log origin/main -1 --oneline 2>&1 | Add-Content $log
  "OK" | Add-Content $log
} catch {
  "FAIL: $_" | Add-Content $log
  exit 1
}
