param([string]$Destination = (Join-Path $env:USERPROFILE 'NailMoods-Apple-Secrets'))
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$inf = Join-Path $Destination 'distribution.inf'
$csr = Join-Path $Destination 'NailMoods.certSigningRequest'
if (Test-Path $csr) { throw 'Une demande existe déjà. Utilise-la sans recréer la clé.' }
@'
[Version]
Signature="$Windows NT$"
[NewRequest]
Subject = "CN=NailMoods Apple Distribution CI, E=contact@nailmoods.com, C=FR"
FriendlyName = "NailMoods Apple Distribution CI"
KeyLength = 2048
KeySpec = 2
Exportable = TRUE
MachineKeySet = FALSE
ProviderName = "Microsoft Enhanced RSA and AES Cryptographic Provider"
ProviderType = 24
RequestType = PKCS10
HashAlgorithm = sha256
KeyUsage = 0xa0
'@ | Set-Content -LiteralPath $inf -Encoding ascii
& certreq.exe -new -user $inf $csr
if ($LASTEXITCODE -ne 0) { throw 'Windows ne peut pas créer la demande de signature.' }
Write-Host "Demande publique à fournir à Apple : $csr"
Write-Host 'La clé privée reste dans le magasin Windows de cet utilisateur. Garde ce PC pour exporter le P12 après réception du certificat.'
