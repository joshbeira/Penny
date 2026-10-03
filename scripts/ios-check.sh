#!/usr/bin/env bash
set -euo pipefail
mkdir -p ios/build/screenshots
SIMULATOR_ID=$(xcrun simctl list devices available -j | python3 -c 'import json,sys; devices=json.load(sys.stdin)["devices"]; runtimes=sorted((r for r in devices if "iOS" in r),key=lambda r:tuple(int(n) for n in r.split("iOS-")[-1].split("-")),reverse=True); candidates=[d for r in runtimes for d in devices[r] if d["name"].startswith("iPhone")]; print(candidates[0]["udid"])')
test -n "$SIMULATOR_ID"
xcrun simctl boot "$SIMULATOR_ID" || true
python3 -c 'import subprocess,sys; subprocess.run(["xcrun","simctl","bootstatus",sys.argv[1],"-b"],check=True,timeout=180)' "$SIMULATOR_ID"
xcrun simctl status_bar "$SIMULATOR_ID" override --time '9:41' --batteryState charged --batteryLevel 100
xcodebuild -project ios/Penny.xcodeproj -scheme Penny -destination "platform=iOS Simulator,id=$SIMULATOR_ID" -destination-timeout 120 -derivedDataPath ios/build/DerivedData -resultBundlePath ios/build/Tests.xcresult -parallel-testing-enabled NO -test-timeouts-enabled YES -default-test-execution-time-allowance 180 -maximum-test-execution-time-allowance 240 CODE_SIGNING_ALLOWED=NO test 2>&1 | tee ios/build/tests.log
xcodebuild -project ios/Penny.xcodeproj -scheme Penny -configuration Release -destination 'generic/platform=iOS' -derivedDataPath ios/build/Device -archivePath ios/build/Penny.xcarchive CODE_SIGNING_ALLOWED=NO archive 2>&1 | tee ios/build/archive.log
APP=ios/build/DerivedData/Build/Products/Debug-iphonesimulator/Penny.app
xcrun simctl install "$SIMULATOR_ID" "$APP"
xcrun simctl launch "$SIMULATOR_ID" io.github.joshbeira.penny
sleep 3
xcrun simctl io "$SIMULATOR_ID" screenshot ios/build/screenshots/ios-home.png
xcrun xcresulttool export attachments --path ios/build/Tests.xcresult --output-path ios/build/screenshots/attachments || true
ditto -c -k --sequesterRsrc --keepParent "$APP" ios/build/Penny-simulator.zip
ditto -c -k --sequesterRsrc --keepParent ios/Penny.xcodeproj ios/build/Penny-project.zip
