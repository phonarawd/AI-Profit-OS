#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$KmsHome = if ($env:AIPO_TRON_KMS_HOME) { $env:AIPO_TRON_KMS_HOME } else { Join-Path $env:LOCALAPPDATA "AI-Profit-OS\tatum-kms" }
$WalletDat = Join-Path $KmsHome "wallet\wallet.dat"
$Readiness = Join-Path $KmsHome "readiness.json"
$fails = @()
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { $fails += "docker_missing" }
else { docker info 1>$null 2>$null; if ($LASTEXITCODE -ne 0) { $fails += "docker_engine_not_ready" } }
if (-not (Test-Path $WalletDat)) { $fails += "wallet_dat_missing" }
$running = ((docker inspect -f "{{.State.Running}}" aipo-tatum-kms 2>$null) -eq "true")
if (-not $running) { $fails += "kms_not_running" }
$result = @{ ok = ($fails.Count -eq 0); walletDat = (Test-Path $WalletDat); running = $running; inboundPublicPort = $false; fails = $fails; at = (Get-Date).ToUniversalTime().ToString("o") }
$result | ConvertTo-Json -Depth 5 | Set-Content -Path $Readiness -Encoding UTF8
if (-not $result.ok) { Write-Host "KMS verify FAIL"; exit 1 }
Write-Host "KMS verify PASS"; exit 0
