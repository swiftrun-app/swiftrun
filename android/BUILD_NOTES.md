# SwiftRun APK build notes (v2.0, manual aapt2 build)

The sandbox blocks Gradle daemon TCP, so this release was built with the
Android SDK build-tools directly (no Gradle). JDK used:
`~/workspace/jdk/jdk-17.0.20.1+1` (add its `bin/` to PATH for `javac`).

IMPORTANT: the web app MUST be built as a single self-contained
`index.html` (vite-plugin-singlefile, everything inlined). Android WebView
CORS-blocks `<script type="module">` loaded from `file:///android_asset`,
so a normal multi-file Vite build renders a blank screen. This was the v1.1
blank-screen fix, and v2.0 keeps the same single-file build.

```sh
export ANDROID_HOME=~/workspace/android-sdk
BT=$ANDROID_HOME/build-tools/34.0.0
export PATH=~/workspace/jdk/jdk-17.0.20.1+1/bin:$PATH

# 1. web app
cd web && npm run build && cd ..    # -> web/dist/index.html (single file)
rm -rf android/app/src/main/assets
mkdir -p android/app/src/main/assets
cp -r web/dist android/app/src/main/assets/www

# 2. resources
$BT/aapt2 compile --dir android/app/src/main/res -o compiled_res.zip
$BT/aapt2 link -o app-unsigned.apk \
  -I $ANDROID_HOME/platforms/android-34/android.jar \
  --manifest android/app/src/main/AndroidManifest.xml \
  --java gen -A android/app/src/main/assets \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 2 --version-name 2.0 compiled_res.zip

# 3. java -> dex
# NOTE: create the dex output dir first. d8 does not create it and fails
# with "Output directory does not exist" otherwise.
javac -cp $ANDROID_HOME/platforms/android-34/android.jar -d obj \
  $(find gen android/app/src/main/java -name "*.java")
mkdir -p dex
$BT/d8 --lib $ANDROID_HOME/platforms/android-34/android.jar \
  --min-api 24 --output dex $(find obj -name "*.class")

# 4. package, align, sign
python3 - <<'PY'
import zipfile, shutil
shutil.copy('app-unsigned.apk','app.apk')
z = zipfile.ZipFile('app.apk','a'); z.write('dex/classes.dex','classes.dex'); z.close()
PY
$BT/zipalign -f 4 app.apk app-aligned.apk
$BT/apksigner sign --ks release.keystore \
  --ks-pass pass:"$RELEASE_KEYSTORE_PASSWORD" \
  --key-pass pass:"$RELEASE_KEY_PASSWORD" \
  --out SwiftRun.apk app-aligned.apk
$BT/apksigner verify --print-certs SwiftRun.apk
```

## Signing

v2.0 is signed with `release.keystore` at the repo root
(SHA-256 cert fingerprint `cf3beba9d1f40438ffd16747fd753825bca84b76a4c88555c189fc67b7dce016`,
package `bw.co.swiftrun`, versionCode 2, versionName 2.0).
The keystore is git-ignored and is NOT in the repo. Keep the file and its
passwords safe: Android requires every future release of this app to be
signed with the same keystore, or users cannot upgrade without uninstalling.

Earlier v1.x builds used the standard Android debug keystore
(`~/.android-debug.keystore`); the v2.0 APK has a different signature, so
the old v1 install must be uninstalled before installing v2.0.

Never commit a keystore, its password, or the `.idsig` sidecar that
apksigner writes next to the APK (`*.idsig` is in `.gitignore`).
