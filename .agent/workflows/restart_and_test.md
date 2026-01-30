---
description: How to restart system and run app on both Emulator and USB Device
---

# Restart & Test Workflow

Follow these steps after a full system restart to test on both your Android Emulator and Physical Device.

## 1. Start Environments
Open VS Code and open your project folder. Open the integrated terminal (`Ctrl + ~`).

### Step 1: Start the Emulator
Run the following command to launch your Pixel 6 emulator:
```powershell
npm run start-emulator
```
*Wait for the emulator to fully boot up.*

### Step 2: Connect Physical Device
1. Connect your Android phone via USB.
2. Ensure **USB Debugging** is enabled on your phone.
3. In a **new terminal tab** (click `+`), check if both devices are connected:
```powershell
adb devices
```
*You should see two devices listed: one `emulator-5554` and one random string (your phone).*

## 2. Run the App

### Step 3: Start the Development Server (Metro)
In the terminal, run:
```powershell
npx expo start
```
*Keep this terminal running. This serves the "Update" to your apps.*

### Step 4: Install/Run on Emulator
Open a **new terminal tab** and run:
```powershell
npx expo run:android --device emulator-5554
```
*This installs the latest native code and connects to Metro.*
*Once the app opens, log in as **User 1**.*

### Step 5: Install/Run on Physical Device
In the **same terminal**, find your phone's device ID from Step 2 (e.g., `1dfd7bcbec20`).
Run:
```powershell
npx expo run:android --device <YOUR_DEVICE_ID>
```
*Replace `<YOUR_DEVICE_ID>` with the actual ID from `adb devices`.*
*Once the app opens, log in as **User 2**.*

## 3. Testing
- You now have the app running on both devices.
- Changes you make in VS Code will update on **both** screens appropriately when you save.
- If expected updates don't appear, press `r` in the `npx expo start` terminal to reload both.
