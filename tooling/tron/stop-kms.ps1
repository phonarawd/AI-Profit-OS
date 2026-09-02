#Requires -Version 5.1
$ErrorActionPreference = "Continue"
docker rm -f aipo-tatum-kms 1>$null 2>$null
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine -match "four-eye-server\.cjs" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host "KMS stopped"
