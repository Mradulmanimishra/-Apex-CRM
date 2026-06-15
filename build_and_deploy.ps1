# ============================================================
# build_and_deploy.ps1 - Apex CRM: Full Build & Deploy
# ============================================================
# This script automates the entire build pipeline:
#   1. Generate debug keystore (if missing)
#   2. Build frontend (Vite)
#   3. Sync web assets into Android (Capacitor)
#   4. Build signed release APK (Gradle)
#   5. Copy APK to frontend/public for Vercel hosting
#   6. Generate QR code linking to the hosted APK
#
# USAGE:
#   cd "C:\Users\mradu\Downloads\files 101"
#   .\build_and_deploy.ps1
# ============================================================

# ── Environment Setup ─────────────────────────────────────────
# Auto-detect JAVA_HOME if not set
if (-Not $env:JAVA_HOME) {
    $jdkSearch = Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($jdkSearch) {
        $env:JAVA_HOME = $jdkSearch.FullName
    }
}
if ($env:JAVA_HOME) {
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    Write-Host "Using JAVA_HOME: $env:JAVA_HOME" -ForegroundColor DarkGray
}

# Auto-detect ANDROID_HOME if not set
if (-Not $env:ANDROID_HOME) {
    $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $sdkPath) {
        $env:ANDROID_HOME = $sdkPath
    }
}
if ($env:ANDROID_HOME) {
    Write-Host "Using ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor DarkGray
}

$ErrorActionPreference = "Stop"

# ── Configuration ─────────────────────────────────────────────
$ProjectRoot    = $PSScriptRoot
$FrontendDir    = Join-Path $ProjectRoot "frontend"
$AndroidDir     = Join-Path $ProjectRoot "android"
$AndroidAppDir  = Join-Path $AndroidDir  "app"
$PublicDir      = Join-Path $FrontendDir "public"

# Keystore settings (debug – replace with production values for store release)
$KeystorePath   = Join-Path $AndroidAppDir "debug.keystore"
$StorePassword  = "android"
$KeyAlias       = "androiddebugkey"
$KeyPassword    = "android"

# Vercel hosting – replace with your actual Vercel project name
$VercelProject  = "apex-crm"
$ApkFileName    = "app-release.apk"
$ApkUrl         = "https://$VercelProject.vercel.app/$ApkFileName"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Apex CRM - Full Build & Deploy" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Generate Debug Keystore ───────────────────────────
Write-Host "[1/6] Checking keystore..." -ForegroundColor Yellow
if (-Not (Test-Path $KeystorePath)) {
    Write-Host "  -> Generating debug keystore at $KeystorePath" -ForegroundColor Green
    keytool -genkeypair -v `
        -keystore $KeystorePath `
        -alias $KeyAlias `
        -keypass $KeyPassword `
        -storepass $StorePassword `
        -keyalg RSA -keysize 2048 -validity 10000 `
        -dname "CN=Apex CRM Debug,O=ApexCRM,C=IN"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Keystore generation failed. Is Java JDK installed and keytool on PATH?"
        exit 1
    }
    Write-Host "  -> Keystore created successfully." -ForegroundColor Green
} else {
    Write-Host "  -> Keystore already exists. Skipping." -ForegroundColor DarkGray
}

# ── Step 2: Build Frontend ────────────────────────────────────
Write-Host ""
Write-Host "[2/6] Building frontend (Vite)..." -ForegroundColor Yellow
Push-Location $FrontendDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed."
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  -> Frontend build complete." -ForegroundColor Green

# ── Step 3: Sync Capacitor ────────────────────────────────────
Write-Host ""
Write-Host "[3/6] Syncing Capacitor web assets..." -ForegroundColor Yellow
Push-Location $ProjectRoot
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Error "Capacitor sync failed."
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  -> Capacitor sync complete." -ForegroundColor Green

# ── Step 4: Build Release APK ─────────────────────────────────
Write-Host ""
Write-Host "[4/6] Building signed release APK..." -ForegroundColor Yellow
Push-Location $AndroidDir
if ($IsWindows -or $env:OS -match "Windows") {
    .\gradlew.bat assembleRelease
} else {
    ./gradlew assembleRelease
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Gradle build failed. Check Android SDK and JDK configuration."
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  -> APK built successfully." -ForegroundColor Green

# ── Step 5: Copy APK to Vercel Public ─────────────────────────
Write-Host ""
Write-Host "[5/6] Copying APK to frontend/public..." -ForegroundColor Yellow
$ApkSource = Join-Path $AndroidAppDir "build\outputs\apk\release\app-release.apk"
$ApkDest   = Join-Path $PublicDir $ApkFileName
if (Test-Path $ApkSource) {
    Copy-Item -Path $ApkSource -Destination $ApkDest -Force
    $apkSize = (Get-Item $ApkDest).Length / 1MB
    Write-Host "  -> APK copied ($([math]::Round($apkSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Warning "APK not found at expected path: $ApkSource"
    Write-Warning "Check the Gradle build output for the actual APK location."
}

# ── Step 6: Generate QR Code ─────────────────────────────────
Write-Host ""
Write-Host "[6/6] Generating QR code..." -ForegroundColor Yellow
$QrImagePath = Join-Path $PublicDir "apk_qr.png"
$EncodedUrl  = [uri]::EscapeDataString($ApkUrl)
$QrApiUrl    = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=$EncodedUrl&format=png&color=6366f1&bgcolor=ffffff"
try {
    Invoke-WebRequest -Uri $QrApiUrl -OutFile $QrImagePath -UseBasicParsing
    Write-Host "  -> QR code saved to $QrImagePath" -ForegroundColor Green
    Write-Host "  -> QR links to: $ApkUrl" -ForegroundColor Cyan
} catch {
    Write-Warning "Could not generate QR code (no internet?). You can generate one manually at https://qrserver.com"
}

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  APK:      $ApkDest" -ForegroundColor White
Write-Host "  QR Code:  $QrImagePath" -ForegroundColor White
Write-Host "  URL:      $ApkUrl" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "    1. Deploy to Vercel:  cd frontend && npx vercel --prod" -ForegroundColor DarkGray
Write-Host "    2. Or install APK directly on device via USB/ADB" -ForegroundColor DarkGray
Write-Host "    3. Scan the QR code to download the APK" -ForegroundColor DarkGray
Write-Host ""
