#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$KmsHome = if ($env:AIPO_TRON_KMS_HOME) { $env:AIPO_TRON_KMS_HOME } else { Join-Path $env:LOCALAPPDATA "AI-Profit-OS\tatum-kms" }
$WalletDir = Join-Path $KmsHome "wallet"
$EnvFile = Join-Path $KmsHome "kms.env"
$Name = "aipo-tatum-kms"
$FourEyeName = "aipo-kms-four-eye"
$TatumnRc = "/home/node/.tatumrc"
$FourEyePort = if ($env:AIPO_KMS_FOUR_EYE_PORT) { $env:AIPO_KMS_FOUR_EYE_PORT } else { "17999" }
$ExternalUrl = "http://host.docker.internal:$FourEyePort"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "DOCKER_NOT_INSTALLED" }
docker info 1>$null 2>$null
if ($LASTEXITCODE -ne 0) { throw "DOCKER_ENGINE_NOT_READY" }
if (-not (Test-Path (Join-Path $WalletDir "wallet.dat"))) { throw "WALLET_DAT_MISSING — run pnpm tron:bootstrap" }
if (-not (Test-Path $EnvFile)) { throw "KMS_ENV_MISSING" }

# Ensure allowlist file exists (empty = sign nothing until Nest queues ids)
$allow = Join-Path $KmsHome "four-eye-allowlist.json"
if (-not (Test-Path $allow)) {
  Set-Content -Path $allow -Value '{"ids":[]}' -Encoding UTF8
}

# Host-side four-eye (bind 127.0.0.1 only)
$existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine -match "four-eye-server\.cjs" }
if (-not $existing) {
  Start-Process -FilePath "node" `
    -ArgumentList @((Join-Path $Root "tooling\tron\four-eye-server.cjs")) `
    -WorkingDirectory $Root `
    -WindowStyle Hidden |
    Out-Null
  Start-Sleep -Seconds 1
}

docker rm -f $Name 1>$null 2>$null
docker run -d --name $Name --restart unless-stopped `
  -e HOME=/home/node `
  --add-host=host.docker.internal:host-gateway `
  --env-file $EnvFile `
  -v "${WalletDir}:${TatumnRc}" `
  tatumio/tatum-kms `
  daemon --period 15 --chain=TRON --external-url=$ExternalUrl | Out-Null
if ($LASTEXITCODE -ne 0) { throw "KMS_START_FAILED" }
Write-Host "KMS started (four-eye $ExternalUrl; no inbound public port)"
