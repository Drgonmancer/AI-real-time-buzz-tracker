$ServerDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location -LiteralPath $ServerDir
$prismaBin = Join-Path $ServerDir 'node_modules\.bin\prisma.cmd'

if (Test-Path -LiteralPath $prismaBin) {
    & $prismaBin db push --accept-data-loss --skip-generate
} else {
    & npx prisma db push --accept-data-loss --skip-generate
}

if ($LASTEXITCODE -ne 0) {
    Write-Host '  Retrying db push...'
    Start-Sleep -Seconds 2
    if (Test-Path -LiteralPath $prismaBin) {
        & $prismaBin db push --accept-data-loss --skip-generate
    } else {
        & npx prisma db push --accept-data-loss --skip-generate
    }
}

exit $LASTEXITCODE
