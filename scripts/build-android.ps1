param([Parameter(Mandatory=$true)][string]$SdkRoot,[Parameter(Mandatory=$true)][string]$JavaHome)
$ErrorActionPreference='Stop'
$env:JAVA_HOME=(Resolve-Path -LiteralPath $JavaHome).Path
$env:ANDROID_HOME=(Resolve-Path -LiteralPath $SdkRoot).Path
Push-Location (Join-Path $PSScriptRoot '..')
try {
  npm run android
  if($LASTEXITCODE -ne 0){throw 'Web build or Capacitor sync failed'}
  Push-Location android
  try { & ./gradlew.bat assembleDebug; if($LASTEXITCODE -ne 0){throw 'Android build failed'} } finally { Pop-Location }
  Copy-Item -LiteralPath android/app/build/outputs/apk/debug/app-debug.apk -Destination passage-debug.apk
} finally { Pop-Location }
