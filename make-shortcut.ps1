﻿# 生成桌面快捷方式「公式几何书」
# 双击快捷方式 = 自动配好环境并打开网站；脚本本身可重复执行（覆盖旧快捷方式）
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path

$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop '公式几何书.lnk'

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnkPath)
$sc.TargetPath = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$proj\start-site.ps1`""
$sc.WorkingDirectory = $proj
$sc.IconLocation = 'shell32.dll,13'
$sc.Description = '一键配置环境并打开公式几何书（本地网站）'
$sc.WindowStyle = 7
$sc.Save()

Write-Host "桌面快捷方式已创建：$lnkPath" -ForegroundColor Green
