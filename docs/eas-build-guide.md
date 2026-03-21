# EAS Build Developer Guide

This guide covers everything needed to go from zero to a running native build using Expo Application Services (EAS).

---

## 1. Prerequisites

| Requirement | Version | Install |
|-------------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| EAS CLI | ≥ 12 | `npm install -g eas-cli` |
| Expo account | any | https://expo.dev/signup |
| Xcode (iOS, macOS only) | ≥ 15 | Mac App Store |
| Android Studio (Android) | any | https://developer.android.com/studio |

---

## 2. First-Time Setup

### 2.1 Install dependencies

```bash
cd mobile
npm install
```

### 2.2 Log in to Expo

```bash
eas login
# Enter your Expo account credentials
```

### 2.3 Link the project to EAS

```bash
cd mobile
eas init
# Follow the prompts — this creates a real EAS project and prints a projectId
```

### 2.4 Replace the placeholder project ID

After `eas init`, copy the printed `projectId` and replace both occurrences of `PLACEHOLDER_PROJECT_ID` in `mobile/app.json`:

```json
"updates": {
  "url": "https://u.expo.dev/<YOUR_PROJECT_ID>"
},
"extra": {
  "eas": {
    "projectId": "<YOUR_PROJECT_ID>"
  }
}
```

---

## 3. Local Development Build

A development build is a native binary with `expo-dev-client` that behaves like Expo Go but supports any native module.

### 3.1 iOS Simulator (macOS only)

```bash
cd mobile
eas build --profile development --platform ios --local
# Opens the simulator automatically after install
```

Or trigger the dev server for an already-installed dev build:

```bash
npx expo start --dev-client
```

### 3.2 Android Emulator / Device

```bash
cd mobile
eas build --profile development --platform android --local
# Produces an APK — drag to emulator or adb install
```

```bash
adb install build-*.apk
npx expo start --dev-client
```

> **Note:** `--local` builds on your machine (requires Xcode/Android Studio). Remove `--local` to build in the EAS cloud.

---

## 4. Cloud Build Commands

| Profile | Platform | Command | Output |
|---------|----------|---------|--------|
| development | iOS | `eas build --profile development --platform ios` | IPA (simulator) |
| development | Android | `eas build --profile development --platform android` | APK |
| preview | iOS | `eas build --profile preview --platform ios` | IPA (ad-hoc) |
| preview | Android | `eas build --profile preview --platform android` | APK |
| production | iOS | `eas build --profile production --platform ios` | IPA (App Store) |
| production | Android | `eas build --profile production --platform android` | AAB (Play Store) |
| any | both | `eas build --profile <profile> --platform all` | iOS + Android |

Build status and download links are shown at https://expo.dev and printed in the terminal.

---

## 5. Installing a Preview Build

### Android
The EAS CLI prints a QR code after a successful build. Scan it on your Android device to download and install the APK directly.

Alternatively, download from https://expo.dev → your project → Builds → select the build → Download.

### iOS
Preview iOS builds require either:
- **TestFlight** (needs Apple Developer account)
- **Ad-hoc distribution** (device UDID registered in your Apple provisioning profile)

For internal testing without an Apple account, use the Android preview build or the iOS simulator development build.

---

## 6. OTA Updates (EAS Update)

OTA updates push JS/TS changes to existing app installs without a new store submission. Only JS changes are delivered — native code changes still require a full build.

### Publish an update

```bash
cd mobile
eas update --branch preview --message "Fix: task list sorting"
```

### Branches

| Branch | Audience |
|--------|----------|
| `development` | Local dev builds |
| `preview` | Internal testers |
| `production` | Store users |

> **Important:** OTA updates only work when the app's `runtimeVersion` matches the update's runtime version. A native code change (new package, `app.json` plugin) requires a new full build.

---

## 7. Troubleshooting

### `eas build` fails with "project not found"
Run `eas init` again and ensure `extra.eas.projectId` in `app.json` matches the EAS project.

### `expo install --check` reports mismatches
Run `npx expo install --fix` to auto-correct dependency versions.

### iOS simulator build not appearing
Ensure Xcode Command Line Tools are installed: `xcode-select --install`.

### Android APK not installing
Enable "Install from unknown sources" on the device. For emulators: `adb install -r build.apk`.

### `npx expo start --dev-client` shows QR but app crashes
The dev build must match the running Metro server's runtime version. Rebuild if you changed native dependencies.

---

## Quick Reference

```bash
# Start Metro for dev build
npx expo start --dev-client

# Cloud build — preview APK
eas build --profile preview --platform android

# Cloud build — both platforms
eas build --profile production --platform all

# Publish OTA update
eas update --branch production --message "Release v1.0.0"

# Check dependency compatibility
npx expo install --check
```
