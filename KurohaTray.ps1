param(
  [Parameter(Mandatory=$true)][string]$Url,
  [Parameter(Mandatory=$true)][int]$Port,
  [Parameter(Mandatory=$true)][string]$Launcher,
  [int]$CheckUpdates = 1
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Application
$notify.Text = "Kuroha"
$notify.Visible = $true
$script:lastUpdateCheck = [DateTime]::MinValue

function Open-Kuroha {
  Start-Process $Url
}

function Stop-KurohaBackend {
  try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    foreach ($connection in $connections) {
      if ($connection.OwningProcess -gt 0) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {
  }
}

function Show-UpdateNotification {
  $notify.BalloonTipTitle = "Kuroha"
  $notify.BalloonTipText = "Доступно обновление. Откройте раздел «Обновление»."
  $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
  $notify.ShowBalloonTip(5000)
}

function Invoke-KurohaAutoCheck {
  if ($CheckUpdates -ne 1) {
    return
  }

  try {
    $base = $Url.TrimEnd("/")
    $preferences = Invoke-RestMethod -Uri ($base + "/api/v1/update/preferences") -TimeoutSec 8
    $mode = [string]$preferences.auto_check
    if ($mode -eq "off") {
      return
    }

    $now = Get-Date
    $minimumMinutes = if ($mode -eq "hourly") { 55 } else { 23 * 60 }
    if ($script:lastUpdateCheck -ne [DateTime]::MinValue) {
      $elapsed = ($now - $script:lastUpdateCheck).TotalMinutes
      if ($elapsed -lt $minimumMinutes) {
        return
      }
    }

    $status = Invoke-RestMethod -Uri ($base + "/api/v1/update/status") -TimeoutSec 12
    $script:lastUpdateCheck = $now
    if ($status.update_available) {
      Show-UpdateNotification
    }
  } catch {
  }
}

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$openItem = $menu.Items.Add("Открыть Kuroha")
$openItem.Add_Click({ Open-Kuroha })

$updateItem = $menu.Items.Add("Проверить обновления")
$updateItem.Add_Click({
  try {
    $status = Invoke-RestMethod -Uri ($Url.TrimEnd("/") + "/api/v1/update/status") -TimeoutSec 12
    $script:lastUpdateCheck = Get-Date
    if ($status.update_available) {
      Show-UpdateNotification
    } else {
      $notify.BalloonTipTitle = "Kuroha"
      $notify.BalloonTipText = "Установлена актуальная версия."
      $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
      $notify.ShowBalloonTip(3500)
    }
  } catch {
  }
  Start-Process ($Url.TrimEnd("/") + "/update")
})

$restartItem = $menu.Items.Add("Перезапустить")
$restartItem.Add_Click({
  $notify.Visible = $false
  Stop-KurohaBackend
  Start-Sleep -Milliseconds 400
  Start-Process -FilePath $Launcher
  [System.Windows.Forms.Application]::Exit()
})

$null = $menu.Items.Add("-")

$exitItem = $menu.Items.Add("Выход")
$exitItem.Add_Click({
  $notify.Visible = $false
  Stop-KurohaBackend
  [System.Windows.Forms.Application]::Exit()
})

$notify.ContextMenuStrip = $menu
$notify.Add_DoubleClick({ Open-Kuroha })

if ($CheckUpdates -eq 1) {
  Invoke-KurohaAutoCheck
  $updateTimer = New-Object System.Windows.Forms.Timer
  $updateTimer.Interval = 3600000
  $updateTimer.Add_Tick({ Invoke-KurohaAutoCheck })
  $updateTimer.Start()
}

[System.Windows.Forms.Application]::Run()
if ($null -ne $updateTimer) {
  $updateTimer.Stop()
  $updateTimer.Dispose()
}
$notify.Visible = $false
$notify.Dispose()
