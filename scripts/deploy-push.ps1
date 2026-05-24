$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

$log = Join-Path $PSScriptRoot '..\DEPLOY-RESULT.txt'
"" | Set-Content $log

function Log($msg) {
  $line = "$(Get-Date -Format o) $msg"
  Add-Content -Path $log -Value $line
  Write-Host $line
}

try {
  Log "=== DEPLOY START ==="
  git fetch origin 2>&1 | ForEach-Object { Log $_ }
  git pull --rebase origin main 2>&1 | ForEach-Object { Log $_ }
  npm run build 2>&1 | ForEach-Object { Log $_ }
  git add -A 2>&1 | ForEach-Object { Log $_ }
  git commit -m "fix: CCM exclusive route, layout hardening v6, orphan session signOut" 2>&1 | ForEach-Object { Log $_ }
  git push origin main 2>&1 | ForEach-Object { Log $_ }
  git log origin/main -1 --oneline 2>&1 | ForEach-Object { Log $_ }
  Log "=== DEPLOY OK ==="
  Write-Host "`nOK. Attendre ~2 min puis Ctrl+Shift+R sur https://renovec.fr`n"
} catch {
  Log "ERROR: $_"
  Write-Host "FAILED - voir DEPLOY-RESULT.txt" -ForegroundColor Red
  exit 1
}
