# 公式几何书 · 一键启动脚本
# 作用：检查 Node 环境 → 首次运行自动安装依赖 → 启动本地服务 → 打开浏览器
# 由桌面快捷方式调用，正常情况下全程无黑窗；仅在缺环境/出错时弹出提示框
param(
  [switch]$DryRun  # 测试用：只打印将要执行的动作，不真正启动/打开浏览器
)

$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $proj

$port = 5173
$url  = "http://localhost:$port/"

function Show-Error($msg) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($msg, '公式几何书启动失败', 'OK', 'Error') | Out-Null
}

function Test-SiteUp {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $r.StatusCode -eq 200
  } catch { return $false }
}

function Test-PortListening {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect('127.0.0.1', $port, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne(800)) { $client.EndConnect($iar); return $true }
    return $false
  } catch { return $false } finally { $client.Close() }
}

# 1) Node 环境检查
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) {
  if ($DryRun) { Write-Host '[DRY] 未检测到 Node.js，将弹框提示' } else {
    Show-Error "未检测到 Node.js。`n`n请先安装 Node.js 18 或更高版本（https://nodejs.org），安装后重新双击快捷方式即可。"
  }
  exit 1
}

# 2) 首次运行：安装依赖（.npmrc 已配置 legacy-peer-deps）
if (-not (Test-Path (Join-Path $proj 'node_modules'))) {
  if ($DryRun) { Write-Host '[DRY] node_modules 不存在，将执行 npm install' } else {
    # 开一个正常窗口显示安装进度，装完自动关闭
    $install = Start-Process -FilePath 'powershell.exe' -Wait -PassThru -ArgumentList @(
      '-NoProfile', '-Command',
      "Set-Location -LiteralPath '$proj'; Write-Host '首次运行，正在安装依赖，请稍候……' -ForegroundColor Cyan; npm install; `$code=`$LASTEXITCODE; Start-Sleep -Seconds 2; exit `$code"
    )
    if ($install.ExitCode -ne 0) {
      Show-Error "依赖安装失败（npm install 退出码 $($install.ExitCode)）。`n请检查网络后重试，或在项目目录手动执行 npm install。"
      exit 1
    }
  }
}

# 3) 服务未运行则启动（独立最小化窗口承载 Vite，关掉它即停止网站）
if (-not (Test-SiteUp)) {
  if (Test-PortListening) {
    if (-not $DryRun) { Show-Error "端口 $port 被其他程序占用，且不是本网站。`n请关闭占用程序后重试。" }
    exit 1
  }
  if ($DryRun) { Write-Host '[DRY] 将启动 npm run dev 并等待服务就绪' } else {
    Start-Process -FilePath 'powershell.exe' -WindowStyle Minimized -ArgumentList @(
      '-NoProfile', '-Command',
      "Set-Location -LiteralPath '$proj'; npm run dev -- --port $port --strictPort"
    )
    $ready = $false
    for ($i = 0; $i -lt 45; $i++) {
      Start-Sleep -Seconds 1
      if (Test-SiteUp) { $ready = $true; break }
    }
    if (-not $ready) {
      Show-Error "本地服务在 45 秒内未启动成功。`n请在项目目录运行 npm run dev 查看具体报错。"
      exit 1
    }
  }
}

# 4) 打开浏览器
if ($DryRun) { Write-Host "[DRY] 将打开默认浏览器：$url" } else { Start-Process $url }
