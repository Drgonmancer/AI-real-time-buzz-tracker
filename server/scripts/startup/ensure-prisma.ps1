$ServerDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location -LiteralPath $ServerDir

$enginePath = Join-Path $ServerDir 'node_modules\.prisma\client\query_engine-windows.dll.node'
$indexPath = Join-Path $ServerDir 'node_modules\.prisma\client\index.js'
$schemaPath = Join-Path $ServerDir 'prisma\schema.prisma'
$prismaBin = Join-Path $ServerDir 'node_modules\.bin\prisma.cmd'

function Test-PrismaClientReady() {
    return (Test-Path -LiteralPath $indexPath) -and (Test-Path -LiteralPath $enginePath)
}

function Test-SchemaNewerThanClient() {
    if (-not (Test-Path -LiteralPath $schemaPath)) { return $true }
    if (-not (Test-Path -LiteralPath $indexPath)) { return $true }
    $schemaTime = (Get-Item -LiteralPath $schemaPath).LastWriteTimeUtc
    $clientTime = (Get-Item -LiteralPath $indexPath).LastWriteTimeUtc
    return $schemaTime -gt $clientTime
}

function Invoke-PrismaGenerate() {
    if (Test-Path -LiteralPath $prismaBin) {
        & $prismaBin generate
    } else {
        & npx prisma generate
    }
    return $LASTEXITCODE
}

function Clear-PrismaTempFiles() {
    $clientDir = Join-Path $ServerDir 'node_modules\.prisma\client'
    if (Test-Path -LiteralPath $clientDir) {
        Get-ChildItem -LiteralPath $clientDir -Filter '*.tmp*' -ErrorAction SilentlyContinue |
            Remove-Item -Force -ErrorAction SilentlyContinue
    }
}

function Stop-ServerNodeProcesses() {
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        ForEach-Object {
            $cmd = $_.CommandLine
            if ($cmd -and $cmd -like "*$ServerDir*") {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            }
        }
    Get-Process -Name 'tsx' -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
}

if ((Test-PrismaClientReady) -and -not (Test-SchemaNewerThanClient)) {
    Write-Host '  Prisma client is up to date (skipped generate)'
    exit 0
}

if ((Test-PrismaClientReady)) {
    Write-Host '  Schema changed - regenerating Prisma client...'
} elseif (Test-Path -LiteralPath $indexPath) {
    Write-Host '  Prisma engine missing - regenerating...'
} else {
    Write-Host '  First-time Prisma client generation...'
}

for ($attempt = 1; $attempt -le 3; $attempt++) {
    Clear-PrismaTempFiles
    $code = Invoke-PrismaGenerate
    if ($code -eq 0) {
        Write-Host '  (Prisma generate OK)'
        exit 0
    }

    if ($attempt -lt 3) {
        Write-Host "  Generate failed (attempt $attempt/3), releasing locks..."
        Stop-ServerNodeProcesses
        Start-Sleep -Seconds 3
    }
}

if (Test-PrismaClientReady) {
    Write-Host '  [WARN] Prisma generate failed but existing client works - continuing'
    exit 0
}

Write-Host '  [ERROR] Prisma generate failed and no usable client found'
exit 1
