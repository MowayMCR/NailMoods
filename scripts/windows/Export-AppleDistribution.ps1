param([Parameter(Mandatory=$true)][string]$Certificate,
 [string]$Destination = (Join-Path $env:USERPROFILE 'NailMoods-Apple-Secrets'))
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$file = (Resolve-Path -LiteralPath $Certificate).Path
& certreq.exe -accept -user $file
if ($LASTEXITCODE -ne 0) { throw 'Le certificat Apple ne peut pas être associé à la clé privée Windows.' }
$downloaded = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($file)
$cert = Get-Item -LiteralPath ('Cert:\CurrentUser\My\' + $downloaded.Thumbprint)
if (-not $cert.HasPrivateKey) { throw 'La clé privée de la demande initiale est introuvable sur ce PC.' }
$target = Join-Path $Destination 'NailMoods-Distribution.p12'
if (Test-Path $target) { throw 'Le P12 existe déjà. Aucun fichier n’a été remplacé.' }
$password = Read-Host 'Choisis un mot de passe P12 et conserve-le dans ton gestionnaire de mots de passe' -AsSecureString
Export-PfxCertificate -Cert $cert -FilePath $target -Password $password -ChainOption EndEntityCertOnly -CryptoAlgorithmOption AES256_SHA256 | Out-Null
Write-Host "P12 protégé créé : $target"
Write-Host 'Le fichier et son mot de passe se placent directement dans GitHub Secrets. Ne les envoie pas dans le chat.'
