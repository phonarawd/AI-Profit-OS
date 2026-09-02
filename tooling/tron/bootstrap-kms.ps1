#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$KmsHome = if ($env:AIPO_TRON_KMS_HOME) { $env:AIPO_TRON_KMS_HOME } else { Join-Path $env:LOCALAPPDATA "AI-Profit-OS\tatum-kms" }
$WalletDir = Join-Path $KmsHome "wallet"
$EnvFile = Join-Path $KmsHome "kms.env"
$Readiness = Join-Path $KmsHome "readiness.json"
$LocalEnv = Join-Path $Root ".env.tron.local"
function Write-Status($obj) { $obj | ConvertTo-Json -Depth 6 | Set-Content -Path $Readiness -Encoding UTF8 }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "DOCKER_NOT_INSTALLED" }
docker info 1>$null 2>$null
if ($LASTEXITCODE -ne 0) { throw "DOCKER_ENGINE_NOT_READY — Docker Desktop을 켠 뒤 다시 pnpm tron:bootstrap" }
New-Item -ItemType Directory -Force -Path $WalletDir | Out-Null
$apiKey = $null; $network = "mainnet"
if (Test-Path $LocalEnv) {
  Get-Content $LocalEnv | ForEach-Object {
    if ($_ -match '^\s*TATUM_MAINNET_API_KEY=(.+)$') { $apiKey = $Matches[1].Trim() }
    if ($_ -match '^\s*TATUM_NETWORK=(.+)$') { $network = $Matches[1].Trim().ToLower() }
    if ($_ -match '^\s*TATUM_TESTNET_API_KEY=(.+)$' -and $network -eq "testnet") { $apiKey = $Matches[1].Trim() }
  }
}
if (-not $apiKey) { throw "TATUM_API_KEY_MISSING — 먼저 pnpm tron:setup" }
$pwdFile = Join-Path $KmsHome "kms.password"
if (-not (Test-Path $pwdFile)) {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  Set-Content -Path $pwdFile -Value ([Convert]::ToBase64String($bytes)) -Encoding ASCII
}
$kmsPass = (Get-Content $pwdFile -Raw).Trim()
@"
TATUM_API_KEY=$apiKey
TATUM_KMS_PASSWORD=$kmsPass
"@ | Set-Content -Path $EnvFile -Encoding ASCII
$walletDat = Join-Path $WalletDir "wallet.dat"
$sigId = $null; $xpub = $null
if (-not (Test-Path $walletDat)) {
  $args = @("run","--rm","-i","--env-file",$EnvFile,"-v","${WalletDir}:/root/.tatumrc","tatumio/tatum-kms","generatemanagedwallet","TRON")
  if ($network -eq "testnet") { $args += "--testnet" }
  $out = & docker @args 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { Write-Status @{ ok=$false; error="KMS_GENERATE_FAILED" }; throw "KMS_GENERATE_FAILED" }
  if ($out -match '\{[\s\S]*"signatureId"[\s\S]*\}') {
    $parsed = $Matches[0] | ConvertFrom-Json
    $sigId = $parsed.signatureId; $xpub = $parsed.xpub
  }
  if (-not $sigId -or -not $xpub) { throw "KMS_OUTPUT_PARSE_FAILED" }
  $map = @{}
  if (Test-Path $LocalEnv) {
    Get-Content $LocalEnv | ForEach-Object {
      if ($_ -match '^\s*([^=]+)=(.*)$' -and $_ -notmatch '^\s*#') { $map[$Matches[1].Trim()] = $Matches[2].Trim() }
    }
  }
  $map["TATUM_KMS_SIGNATURE_ID"] = $sigId
  $map["TRON_HOT_WALLET_XPUB"] = $xpub
  if (-not $map.ContainsKey("TRONGRID_BASE_URL")) { $map["TRONGRID_BASE_URL"] = "https://api.trongrid.io" }
  $outLines = @("# AI Profit OS — TRON local secrets (NEVER commit)", "# updated by tron:bootstrap", "")
  foreach ($k in $map.Keys) { $outLines += "$k=$($map[$k])" }
  Set-Content -Path $LocalEnv -Value $outLines -Encoding UTF8
} else {
  if (Test-Path $LocalEnv) {
    Get-Content $LocalEnv | ForEach-Object {
      if ($_ -match '^\s*TATUM_KMS_SIGNATURE_ID=(.+)$') { $sigId = $Matches[1].Trim() }
      if ($_ -match '^\s*TRON_HOT_WALLET_XPUB=(.+)$') { $xpub = $Matches[1].Trim() }
    }
  }
}
if (-not (Test-Path $walletDat)) { throw "WALLET_DAT_MISSING" }
Write-Status @{ ok=$true; stage="bootstrap"; walletDat=$true; signatureIdSet=[bool]$sigId; xpubSet=[bool]$xpub; inboundPublicPort=$false; at=(Get-Date).ToUniversalTime().ToString("o") }
Write-Host "KMS bootstrap OK (secrets not printed)"
