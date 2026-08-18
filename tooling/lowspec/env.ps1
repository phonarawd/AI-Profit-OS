# ADR-016 — source in PowerShell before local web|api on this PC
# Usage: . .\tooling\lowspec\env.ps1
$env:NODE_OPTIONS = "--max-old-space-size=1536"
$env:UV_THREADPOOL_SIZE = "2"
Write-Host "[lowspec] NODE_OPTIONS=$env:NODE_OPTIONS  UV_THREADPOOL_SIZE=$env:UV_THREADPOOL_SIZE"
node "$PSScriptRoot\status.cjs"
