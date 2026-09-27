param([switch]$Serve)
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $project
$node = (Get-Command node.exe -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath "$project\.output\server\index.mjs")) {
    throw 'Primero ejecuta npm run build en la carpeta del proyecto.'
}

if ($Serve) {
    if (Test-Path -LiteralPath "$project\.data\local-database.json") {
        & $node "$project\scripts\setup-local.mjs"
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar la base de datos local.' }
    }
    $env:HOST = '127.0.0.1'
    $env:PORT = '3000'
    $env:NODE_ENV = 'production'
    New-Item -ItemType Directory -Path "$project\.data" -Force | Out-Null
    $server = Start-Process -FilePath $node -ArgumentList '--env-file-if-exists=.env .output/server/index.mjs' -WorkingDirectory $project -WindowStyle Hidden -RedirectStandardOutput "$project\.data\server.log" -RedirectStandardError "$project\.data\server-error.log" -Wait -PassThru
    exit $server.ExitCode
}

# El Programador de tareas mantiene el servidor fuera del proceso del chat.
# Sin inicio automatico de Windows: se inicia desde Iniciar Dragon Vault.cmd.
$taskName = 'DragonVault-Local'
$powershell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $PSCommandPath + '" -Serve'
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $project
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and $existing.Actions.Arguments -ne $arguments) {
    throw "La tarea $taskName pertenece a otra ubicacion. No se modifico."
}
if (-not $existing) {
    Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Description 'Servidor local de Dragon Vault independiente del chat; inicio manual.' | Out-Null
}
if ((Get-ScheduledTask -TaskName $taskName).State -ne 'Running') {
    if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
        throw 'El puerto 3000 ya esta ocupado. No se detuvo ningun proceso.'
    }
    Start-ScheduledTask -TaskName $taskName
}
Write-Host 'Dragon Vault: http://127.0.0.1:3000'
Write-Host 'El servidor sigue activo al cerrar esta ventana o el chat.'
