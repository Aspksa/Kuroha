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

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$openItem = $menu.Items.Add("Открыть Kuroha")
$openItem.Add_Click({ Open-Kuroha })

$updateItem = $menu.Items.Add("Проверить обновления")
$updateItem.Add_Click({ Start-Process ($Url.TrimEnd("/") + "/update") })

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
  try {
    $status = Invoke-RestMethod -Uri ($Url.TrimEnd("/") + "/api/v1/update/status") -TimeoutSec 8
    if ($status.update_available) {
      $notify.BalloonTipTitle = "Kuroha"
      $notify.BalloonTipText = "Доступно обновление. Откройте раздел «Обновление»."
      $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
      $notify.ShowBalloonTip(5000)
    }
  } catch {
  }
}

[System.Windows.Forms.Application]::Run()
$notify.Visible = $false
$notify.Dispose()
