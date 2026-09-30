#!/usr/bin/env bash
set -euo pipefail
mkdir -p android-evidence
adb install apks/debug/app-debug.apk
adb install apks/androidTest/debug/app-debug-androidTest.apk
adb shell settings put global airplane_mode_on 1
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true
adb shell svc wifi disable
adb shell svc data disable
adb shell am instrument -w io.github.joshbeira.penny.test/androidx.test.runner.AndroidJUnitRunner | tee android-evidence/instrumentation.txt
adb pull /sdcard/Android/data/io.github.joshbeira.penny/files/ android-evidence/screenshots || true
adb logcat -d -s AndroidRuntime:E > android-evidence/crashes.txt
grep -q 'OK (' android-evidence/instrumentation.txt
if grep -q 'FAILURES\|INSTRUMENTATION_FAILED\|Process crashed' android-evidence/instrumentation.txt; then exit 1; fi
