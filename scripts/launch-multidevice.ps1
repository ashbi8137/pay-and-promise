
# Script to launch multi-device testing environment

Write-Host "Starting Multi-Device Test Environment..." -ForegroundColor Cyan

# 1. Start Emulator (if not already running)
$emulatorName = "Pixel_6_API_35"
$runningEmulators = adb devices | Select-String "emulator"
if (-not $runningEmulators) {
    Write-Host "Starting Emulator: $emulatorName..."
    $emulatorPath = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"
    Start-Process -FilePath $emulatorPath -ArgumentList "-avd $emulatorName" -NoNewWindow
    Write-Host "Waiting for emulator to boot (30s)..."
    Start-Sleep -Seconds 30
} else {
    Write-Host "Emulator already running."
}

# 2. Get All Connected Devices
$devices = adb devices | Select-String -Pattern "\tdevice"
if (-not $devices) {
    Write-Error "No devices connected!"
    exit 1
}

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
$packageName = "com.ashbin.payandpromise"

# 3. Install and Launch on Each Device
foreach ($line in $devices) {
    $deviceId = $line.ToString().Split("`t")[0]
    Write-Host "Processing Device: $deviceId" -ForegroundColor Green

    # Install APK
    Write-Host "  Installing APK..."
    adb -s $deviceId install -r $apkPath

    # Launch App
    Write-Host "  Launching App..."
    # Using monkey to launch main activity without knowing exact activity name
    adb -s $deviceId shell monkey -p $packageName -c android.intent.category.LAUNCHER 1
}

# 4. Start Expo Server
Write-Host "Starting Expo Server..." -ForegroundColor Yellow
Write-Host "Ensuring all devices connect to this server..."
npx expo start
