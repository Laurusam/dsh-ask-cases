# Install / rollback for dsh-plugin-ask-cases.
#
#   pwsh -File install.ps1 -DryRun     # show what would change, touch nothing
#   pwsh -File install.ps1             # install (writes under ~/.dsh/profiles/desktop)
#   pwsh -File install.ps1 -Rollback   # remove the entry + the link
#
# Patch semantics matter here: cordis.patch.yml entries are *id-targeted*, so a
# plain `- id: X` line only overrides an entry that already exists in the tree.
# New plugins must be inserted, hence the `- insert:` block below.
#
# The desktop app reads the profile at boot, so a restart is required after
# installing. Backups land in the profile's .backup-ask-cases folder.

param(
  [switch]$Rollback,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$ProfileDir = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'
$PluginSrc  = (Resolve-Path $PSScriptRoot).Path.TrimEnd('\')
$PkgName    = 'dsh-ask-cases'
$EntryId    = 'ask-cases'
$PatchFile  = Join-Path $ProfileDir 'cordis.patch.yml'
$NodeModules = Join-Path $ProfileDir 'node_modules'
$LinkPath   = Join-Path $NodeModules $PkgName
$BackupDir  = Join-Path $ProfileDir '.backup-ask-cases'

$EntryText = @"
- insert:
    - id: $EntryId
      name: "$PkgName"
"@

function Write-Step($text) { Write-Host "· $text" }

if (-not (Test-Path -LiteralPath $PatchFile)) { throw "profile patch not found: $PatchFile" }
if (-not (Test-Path -LiteralPath (Join-Path $PluginSrc 'package.json'))) {
  throw "plugin package not found next to this script: $PluginSrc"
}

$patch = Get-Content -LiteralPath $PatchFile -Raw
$hasEntry = $patch -match "(?m)^\s+- id:\s*$([regex]::Escape($EntryId))\s*$"
$hasLink = Test-Path -LiteralPath $LinkPath

function Remove-Entry {
  $lines = Get-Content -LiteralPath $PatchFile
  $out = New-Object System.Collections.Generic.List[string]
  $i = 0
  while ($i -lt $lines.Count) {
    $line = $lines[$i]
    $isInsertHead = $line -match '^- insert:\s*$'
    $nextIsOurs = ($i + 1) -lt $lines.Count -and $lines[$i + 1] -match "id:\s*$([regex]::Escape($EntryId))\b"
    if ($isInsertHead -and $nextIsOurs) {
      $i++
      while ($i -lt $lines.Count -and ($lines[$i] -match '^\s+\S')) { $i++ }
      continue
    }
    $out.Add($line)
    $i++
  }
  Set-Content -LiteralPath $PatchFile -Value $out -Encoding utf8
}

if ($Rollback) {
  Write-Step 'rollback requested'
  if ($hasLink) {
    if ($DryRun) { Write-Step "would remove junction $LinkPath" }
    else { (Get-Item -LiteralPath $LinkPath).Delete(); Write-Step 'removed junction' }
  } else { Write-Step 'no junction to remove' }

  if ($hasEntry) {
    if ($DryRun) { Write-Step "would drop the insert block for '$EntryId'" }
    else { Remove-Entry; Write-Step "dropped insert block for '$EntryId'" }
  } else { Write-Step 'no entry to drop' }

  Write-Step 'restart the app to finish'
  return
}

Write-Step "plugin : $PluginSrc"
Write-Step "profile: $ProfileDir"
Write-Step "entry  : present=$hasEntry  junction=$hasLink"

if ($DryRun) {
  if (-not $hasLink) { Write-Step "would create junction $LinkPath -> $PluginSrc" }
  if (-not $hasEntry) { Write-Step "would append to cordis.patch.yml:`n$EntryText" }
  Write-Step 'dry run: nothing written'
  return
}

# 1. backup
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item -LiteralPath $PatchFile -Destination (Join-Path $BackupDir "cordis.patch.$stamp.yml") -Force
Copy-Item -LiteralPath (Join-Path $ProfileDir 'package.json') -Destination (Join-Path $BackupDir "package.$stamp.json") -Force
Write-Step "backup written to $BackupDir"

# 2. junction
New-Item -ItemType Directory -Force -Path $NodeModules | Out-Null
if ($hasLink) {
  (Get-Item -LiteralPath $LinkPath).Delete()
  Write-Step 'replaced existing junction'
}
New-Item -ItemType Junction -Path $LinkPath -Target $PluginSrc | Out-Null
Write-Step 'junction created'

# 3. entry (insert form — a plain `- id:` line would only override an existing entry)
if (-not $hasEntry) {
  $suffix = if ($patch.EndsWith("`n")) { '' } else { "`n" }
  Add-Content -LiteralPath $PatchFile -Value ($suffix + $EntryText) -Encoding utf8
  Write-Step "insert block for '$EntryId' appended"
} else {
  Write-Step 'entry already present'
}

Write-Step ''
Write-Step "restart DeepSeek Harness, then open a session: a '?' icon appears left of the input."
Write-Step "rollback: pwsh -File `"$($PSCommandPath)`" -Rollback"
