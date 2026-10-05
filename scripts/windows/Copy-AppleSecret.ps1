param([Parameter(Mandatory=$true)][string]$File,[ValidateSet('base64','pem')][string]$Format='base64')
$ErrorActionPreference='Stop'
$path=(Resolve-Path -LiteralPath $File).Path
if($Format -eq 'pem') { Set-Clipboard -Value ([IO.File]::ReadAllText($path)) }
else { Set-Clipboard -Value ([Convert]::ToBase64String([IO.File]::ReadAllBytes($path))) }
Write-Host 'Valeur copiée. Colle-la uniquement dans le secret GitHub correspondant, puis vide le presse-papiers avec Set-Clipboard -Value "".'
