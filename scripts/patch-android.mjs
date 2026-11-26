#!/usr/bin/env node
/**
 * Prepares the generated Capacitor Android project so the APK installs on every
 * Android 9-16 device without signature/permission problems.
 *
 * Runs after `npx cap add android` / `npx cap sync android`.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
const gradlePath = path.join(root, 'android/app/build.gradle');

const VERSION_CODE = 7;
const VERSION_NAME = '1.4.0';
const KEYSTORE = 'release.p12';
const KEY_ALIAS = 'basaayikya';
const KEY_PASSWORD = 'BasAayiKya2026';

function read(p) {
  return fs.readFileSync(p, 'utf8');
}
function write(p, s) {
  fs.writeFileSync(p, s.replace(/\r\n/g, '\n'));
}

/* ---------- 1. AndroidManifest ------------------------------------------- */
let manifest = read(manifestPath);

// HTTP backend (owner's laptop) cannot be reached over cleartext unless allowed.
if (!manifest.includes('usesCleartextTraffic')) {
  manifest = manifest.replace(
    /<application\b/,
    '<application\n        android:usesCleartextTraffic="true"\n        android:installLocation="auto"'
  );
}

// A WebView can only use the camera / GPS when the app itself holds the permission.
const permissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.CAMERA',
  'android.permission.WAKE_LOCK',
  'android.permission.POST_NOTIFICATIONS',
];
for (const perm of permissions) {
  if (!manifest.includes(`android:name="${perm}"`)) {
    manifest = manifest.replace(
      /<\/manifest>/,
      `    <uses-permission android:name="${perm}" />\n</manifest>`
    );
  }
}

// Camera + GPS are optional so the app still installs on devices without them.
if (!manifest.includes('uses-feature')) {
  manifest = manifest.replace(
    /<\/manifest>/,
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n' +
      '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n' +
      '</manifest>'
  );
}

write(manifestPath, manifest);

/* ---------- 2. build.gradle: permanent release signing -------------------- */
let gradle = read(gradlePath);

gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${VERSION_CODE}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${VERSION_NAME}"`);

if (!gradle.includes('signingConfigs')) {
  gradle = gradle.replace(
    /\n\s*buildTypes\s*\{/,
    `

    signingConfigs {
        release {
            storeFile rootProject.file('../keystore/${KEYSTORE}')
            storeType 'PKCS12'
            storePassword '${KEY_PASSWORD}'
            keyAlias '${KEY_ALIAS}'
            keyPassword '${KEY_PASSWORD}'
            // Sign with all three schemes so new AND old installers accept the APK.
            enableV1Signing true
            enableV2Signing true
            enableV3Signing true
            enableV4Signing false
        }
    }

    buildTypes {`
  );
}

gradle = gradle.replace(
  /release\s*\{\s*\n(\s*)minifyEnabled false/,
  (m, indent) => `release {\n${indent}minifyEnabled false\n${indent}signingConfig signingConfigs.release`
);

write(gradlePath, gradle);

/* ---------- 3. sanity check ---------------------------------------------- */
const out = read(manifestPath);
const grad = read(gradlePath);
const problems = [];
if (!out.includes('usesCleartextTraffic="true"')) problems.push('cleartext traffic');
if (!out.includes('ACCESS_FINE_LOCATION')) problems.push('location permission');
if (!out.includes('CAMERA')) problems.push('camera permission');
if (!grad.includes('signingConfig signingConfigs.release')) problems.push('release signing');
if (!fs.existsSync(path.join(root, 'keystore', KEYSTORE))) problems.push('keystore file');

if (problems.length) {
  console.error('patch-android: missing ->', problems.join(', '));
  process.exit(1);
}
console.log(`patch-android: ok (v${VERSION_NAME} / code ${VERSION_CODE}, release-signed)`);
