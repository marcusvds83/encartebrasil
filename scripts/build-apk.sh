#!/bin/bash
set -e

SDK="/home/z/my-project/android-sdk"
BUILD_TOOLS="$SDK/build-tools/35.0.0"
PLATFORM_JAR="$SDK/platforms/android-34/android.jar"
PROJECT="/home/z/my-project/apk-project"
BUILD="$PROJECT/build"
AAPT2="$BUILD_TOOLS/aapt2"
JAVAC="/home/z/my-project/jdk-21.0.2/bin/javac"
D8="$BUILD_TOOLS/d8"
ZIPALIGN="$BUILD_TOOLS/zipalign"
APKSIGNER="$BUILD_TOOLS/apksigner"

echo "=== Step 1: Compile resources ==="
$AAPT2 compile --dir $PROJECT/app/src/main/res -o $BUILD/resources.zip
$AAPT2 link -o $BUILD/apk.unsigned.unaligned.apk \
  -I $PLATFORM_JAR \
  --manifest $PROJECT/app/src/main/AndroidManifest.xml \
  --java $BUILD/gen \
  $BUILD/resources.zip

echo "=== Step 2: Compile Java ==="
mkdir -p $BUILD/classes
$JAVAC --release 11 \
  -classpath $PLATFORM_JAR \
  -d $BUILD/classes \
  $BUILD/gen/com/encartebrasil/app/R.java \
  $PROJECT/app/src/main/java/com/encartebrasil/app/MainActivity.java

echo "=== Step 3: Convert to DEX (with --lib for Android API) ==="
mkdir -p $BUILD/dex
$D8 --output $BUILD/dex \
  --lib $PLATFORM_JAR \
  $(find $BUILD/classes -name "*.class")

echo "=== Step 4: Build unsigned APK ==="
cp $BUILD/apk.unsigned.unaligned.apk $BUILD/apk.unsigned.apk
cd $BUILD
cp dex/classes.dex .
zip apk.unsigned.apk classes.dex

echo "=== Step 5: Zipalign ==="
$ZIPALIGN -f 4 $BUILD/apk.unsigned.apk $BUILD/apk.aligned.apk

echo "=== Step 6: Sign APK ==="
$APKSIGNER sign \
  --ks $BUILD/encartebrasil.keystore \
  --ks-key-alias encartebrasil \
  --ks-pass pass:encarte123 \
  --key-pass pass:encarte123 \
  --out /home/z/my-project/download/EncarteBrasil.apk \
  $BUILD/apk.aligned.apk

echo "=== DONE ==="
ls -lh /home/z/my-project/download/EncarteBrasil.apk