#!/usr/bin/env bash
set -euo pipefail
adb install release-assets/*.apk
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
adb logcat -c
adb shell am start -W -n io.github.joshbeira.penny/.MainActivity
adb shell uiautomator dump /sdcard/penny-window.xml
adb pull /sdcard/penny-window.xml release-assets/release-window.xml
grep -q 'Read a letter' release-assets/release-window.xml
adb exec-out screencap -p > release-assets/android-release.png
adb logcat -d -s AndroidRuntime:E > release-assets/release-crashes.txt
if grep -q 'FATAL EXCEPTION' release-assets/release-crashes.txt; then exit 1; fi
