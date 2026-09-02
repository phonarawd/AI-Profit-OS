#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$KmsHome = if ($env:AIPO_TRON_KMS_HOME) { $env:AIPO_TRON_KMS_HOME } else { Join-Path $env:LOCALAPPDATA "AI-Profit-OS\tatum-kms" }
$WalletDat = Join-Path $KmsHome "wallet\wallet.dat"
if (-not (Test-Path $WalletDat)) { throw "WALLET_DAT_MISSING" }
$Dest = Join-Path $KmsHome ("backups\" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Copy-Item $WalletDat (Join-Path $Dest "wallet.dat")
if (Test-Path (Join-Path $KmsHome "kms.password")) { Copy-Item (Join-Path $KmsHome "kms.password") (Join-Path $Dest "kms.password") }
Write-Host "KMS backup OK -> $Dest (never commit)"
