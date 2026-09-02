#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$KmsHome = if ($env:AIPO_TRON_KMS_HOME) { $env:AIPO_TRON_KMS_HOME } else { Join-Path $env:LOCALAPPDATA "AI-Profit-OS\tatum-kms" }
$WalletDir = Join-Path $KmsHome "wallet"
$EnvFile = Join-Path $KmsHome "kms.env"
$Name = "aipo-tatum-kms"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "DOCKER_NOT_INSTALLED" }
docker info 1>$null 2>$null
if ($LASTEXITCODE -ne 0) { throw "DOCKER_ENGINE_NOT_READY" }
if (-not (Test-Path (Join-Path $WalletDir "wallet.dat"))) { throw "WALLET_DAT_MISSING — run pnpm tron:bootstrap" }
if (-not (Test-Path $EnvFile)) { throw "KMS_ENV_MISSING" }
docker rm -f $Name 1>$null 2>$null
docker run -d --name $Name --restart unless-stopped --env-file $EnvFile -v "${WalletDir}:/root/.tatumrc" tatumio/tatum-kms daemon --period 15 --chain=TRON | Out-Null
if ($LASTEXITCODE -ne 0) { throw "KMS_START_FAILED" }
Write-Host "KMS started (no inbound public port)"
