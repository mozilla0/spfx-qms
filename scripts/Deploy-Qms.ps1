<#
.SYNOPSIS
  Lädt das QMS (qms-spfx.sppkg) in den App-Katalog und installiert es auf der QMS-Site.

.DESCRIPTION
  - Lädt das Paket in den Tenant- oder Site-App-Katalog und veröffentlicht es.
  - Installiert bzw. aktualisiert die App auf der Ziel-Site.
  Danach auf der Site eine Seite mit dem Webpart «QMS Einrichtung» anlegen und dort
  «QMS einrichten», «Beispieldaten anlegen» und «Seiten erstellen» ausführen.
  Die Lösung benötigt keine API-Berechtigungen (nur SharePoint-REST im Benutzerkontext).

.EXAMPLE
  ./Deploy-Qms.ps1 -TenantAdminUrl https://<tenant>-admin.sharepoint.com `
    -SiteUrl https://<tenant>.sharepoint.com/sites/qms -ClientId <app-id> -Tenant <tenant>.onmicrosoft.com `
    -CertificatePath ./pnp.pfx -WhatIf

.EXAMPLE
  ./Deploy-Qms.ps1 -TenantAdminUrl https://<tenant>-admin.sharepoint.com `
    -SiteUrl https://<tenant>.sharepoint.com/sites/qms -ClientId <app-id> -Interactive
#>
#Requires -Version 7
#Requires -Modules PnP.PowerShell
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)] [string] $TenantAdminUrl,
    [Parameter(Mandatory)] [string] $SiteUrl,
    [Parameter(Mandatory)] [string] $ClientId,
    [string] $Tenant,
    [string] $CertificatePath,
    [switch] $Interactive,
    [ValidateSet('Tenant', 'Site')] [string] $Scope = 'Tenant',
    [string] $PackagePath = (Join-Path $PSScriptRoot '..' 'sharepoint' 'solution' 'qms-spfx.sppkg'),
    [string] $LogPath = (Join-Path $PSScriptRoot "deploy-qms-$(Get-Date -Format 'yyyyMMdd-HHmmss').log")
)

$ErrorActionPreference = 'Stop'

function Write-Log([string] $Message, [string] $Level = 'INFO') {
    $line = '{0} [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Write-Host $line
    Add-Content -Path $LogPath -Value $line
}

function Invoke-WithRetry([scriptblock] $Action, [int] $MaxAttempts = 5) {
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try { return & $Action }
        catch {
            $msg = $_.Exception.Message
            if ($i -lt $MaxAttempts -and $msg -match '429|503|throttl') {
                $wait = [math]::Pow(2, $i) * 5
                Write-Log "Throttling – neuer Versuch in $wait s ($i/$MaxAttempts)" 'WARN'
                Start-Sleep -Seconds $wait
            } else { throw }
        }
    }
}

function Connect-Target([string] $Url) {
    if ($Interactive) {
        Connect-PnPOnline -Url $Url -ClientId $ClientId -Interactive
    } else {
        if (-not $Tenant -or -not $CertificatePath) { throw 'Für die App-Anmeldung sind -Tenant und -CertificatePath nötig (oder -Interactive).' }
        Connect-PnPOnline -Url $Url -ClientId $ClientId -Tenant $Tenant -CertificatePath $CertificatePath
    }
}

$summary = [ordered]@{ Hochgeladen = 0; Installiert = 0; Aktualisiert = 0; Fehler = 0 }
try {
    if (-not (Test-Path $PackagePath)) { throw "Paket nicht gefunden: $PackagePath (zuerst 'npm run build')." }
    Write-Log "Paket: $PackagePath, Scope: $Scope"

    $catalogUrl = if ($Scope -eq 'Tenant') { $TenantAdminUrl } else { $SiteUrl }
    Connect-Target $catalogUrl
    $app = $null
    if ($PSCmdlet.ShouldProcess($catalogUrl, "App-Katalog: qms-spfx.sppkg hochladen und veröffentlichen")) {
        $app = Invoke-WithRetry { Add-PnPApp -Path $PackagePath -Scope $Scope -Publish -Overwrite }
        $summary.Hochgeladen++
        Write-Log "Hochgeladen und veröffentlicht (App-ID $($app.Id))."
    }

    Connect-Target $SiteUrl
    if ($app -and $PSCmdlet.ShouldProcess($SiteUrl, 'App installieren/aktualisieren')) {
        $installed = Get-PnPApp -Identity $app.Id -Scope $Scope
        if ($installed.InstalledVersion) {
            Invoke-WithRetry { Update-PnPApp -Identity $app.Id -Scope $Scope } | Out-Null
            $summary.Aktualisiert++
            Write-Log 'App auf der Site aktualisiert.'
        } else {
            Invoke-WithRetry { Install-PnPApp -Identity $app.Id -Scope $Scope -Wait } | Out-Null
            $summary.Installiert++
            Write-Log 'App auf der Site installiert.'
        }
    }
    Write-Log "Nächster Schritt: Webpart «QMS Einrichtung» auf $SiteUrl hinzufügen und ausführen."
}
catch {
    $summary.Fehler++
    Write-Log $_.Exception.Message 'ERROR'
    throw
}
finally {
    Write-Log ('Zusammenfassung: ' + (($summary.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ', '))
}
