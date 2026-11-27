# ==============================================================================
# RosterIQ Windows Desktop Shortcut Creator
# Creates an official RosterIQ shortcut on your Windows Desktop
# ==============================================================================

$targetScript = Join-Path $PSScriptRoot "RosterIQ-Desktop.vbs"
$desktopDir = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopDir "RosterIQ.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$targetScript`""
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "RosterIQ - Intelligent Workforce Planning & Roster Optimization"

# Use Edge or Chrome icon if available
if (Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") {
    $Shortcut.IconLocation = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe, 0"
} elseif (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
    $Shortcut.IconLocation = "C:\Program Files\Google\Chrome\Application\chrome.exe, 0"
}

$Shortcut.Save()
Write-Host "Created Desktop Shortcut at: $shortcutPath" -ForegroundColor Green
