param([Parameter(Mandatory=$true)][string]$Trace)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($Trace, [IO.Compression.ZipArchiveMode]::Update)
try {
  foreach ($entry in @($archive.Entries)) {
    if ($entry.FullName -match '\.network$') {
      $name = $entry.FullName
      $entry.Delete()
      $null = $archive.CreateEntry($name)
    } elseif ($entry.FullName -match '^resources/' -and $entry.FullName -notmatch '\.jpe?g$') {
      $entry.Delete()
    }
  }
} finally { $archive.Dispose() }

