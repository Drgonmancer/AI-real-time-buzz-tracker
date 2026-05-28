$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$serverDir = Join-Path $ProjectRoot 'server'
$clientDir = Join-Path $ProjectRoot 'client'

function Stop-PortListeners([int[]]$Ports) {
    foreach ($port in $Ports) {
        try {
            Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
                ForEach-Object {
                    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                }
        } catch {
            # netstat fallback handled in start.bat
        }
    }
}

function Stop-ProjectNodeProcesses() {
    $patterns = @(
        [regex]::Escape($serverDir),
        [regex]::Escape($clientDir),
        'pulse-server',
        'Pulse-Backend',
        'Pulse-Frontend',
        'tsx watch',
        'vite'
    )

    Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        ForEach-Object {
            $cmd = $_.CommandLine
            if (-not $cmd) { return }
            foreach ($p in $patterns) {
                if ($cmd -match $p) {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                    break
                }
            }
        }

    Get-Process -Name 'tsx' -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
}

Stop-PortListeners @(3000, 5173)
Stop-ProjectNodeProcesses

Start-Sleep -Seconds 2

$prismaClient = Join-Path $serverDir 'node_modules\.prisma\client'
if (Test-Path -LiteralPath $prismaClient) {
    Get-ChildItem -LiteralPath $prismaClient -Filter '*.tmp*' -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}
