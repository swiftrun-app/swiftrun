# SwiftRun APK build notes (v1.1, manual aapt2 build)

The sandbox blocks Gradle daemon TCP, so this release was built with the
Android SDK build-tools directly (no Gradle). JDK used:
`~/workspace/.jdk/jdk-17.0.20.1+1` (add its `bin/` to PATH for `javac`).

IMPORTANT (v1.1 fix): the web app MUST be built as a single self-contained
`index.html` (vite-plugin-singlefile, everything inlined). Android WebView
CORS-blocks `<script type="module">` loaded from `file:///android_asset`,
so a normal multi-file Vite build renders a blank screen. See `vite.config.js`.

```sh
export ANDROID_HOME=~/workspace/.android-sdk
BT=$ANDROID_HOME/build-tools/34.0.0

# 1. web app
npm run build                      # -> dist/
rm -rf android/app/src/main/assets
mkdir -p android/app/src/main/assets
cp -r dist android/app/src/main/assets/www

# 2. resources
$BT/aapt2 compile --dir android/app/src/main/res -o compiled_res.zip
$BT/aapt2 link -o app-unsigned.apk \
  -I $ANDROID_HOME/platforms/android-34/android.jar \
  --manifest android/app/src/main/AndroidManifest.xml \
  --java gen -A android/app/src/main/assets \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0 compiled_res.zip

# 3. java -> dex
javac -cp $ANDROID_HOME/platforms/android-34/android.jar -d obj \
  $(find gen android/app/src/main/java -name "*.java")
$BT/d8 --lib $ANDROID_HOME/platforms/android-34/android.jar \
  --min-api 24 --output dex $(find obj -name "*.class")

# 4. package, align, sign
python3 - <<'PY'
import zipfile, shutil
shutil.copy('app-unsigned.apk','app.apk')
z = zipfile.ZipFile('app.apk','a'); z.write('dex/classes.dex','classes.dex'); z.close()
PY
$BT/zipalign -f 4 app.apk app-aligned.apk
$BT/apksigner sign --ks ~/.android-debug.keystore \
  --ks-pass pass:android --key-pass pass:android \
  --out SwiftRun.apk app-aligned.apk
$BT/apksigner verify SwiftRun.apk
```

The debug keystore (`~/.android-debug.keystore`, alias `androiddebugkey`,
password `android`) is a standard debug key for testing only.
