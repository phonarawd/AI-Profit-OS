#Requires -Version 5.1
$ErrorActionPreference = "Stop"
docker rm -f aipo-tatum-kms 1>$null 2>$null
Write-Host "KMS stopped"
