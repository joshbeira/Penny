#!/usr/bin/env bash
set -euo pipefail
mkdir -p ios/build/screenshots
SIMULATOR_ID=$(xcrun simctl list devices available -j | python3 -c 'import json,sys; devices=json.load(sys.stdin)["devices"]; candidates=[d for runtime,items in devices.items() if "iOS" in runtime for d in items if d["name"].startswith("iPhone")]; print(candidates[0]["udid"])')
test -n "$SIMULATOR_ID"
xcrun simctl boot "$SIMULATOR_ID" || true
xcrun simctl bootstatus "$SIMULATOR_ID" -b
xcrun simctl status_bar "$SIMULATOR_ID" override --time '9:41' --batteryState charged --batteryLevel 100
xcodebuild -project ios/Penny.xcodeproj -scheme Penny -destination "platform=iOS Simulator,id=$SIMULATOR_ID" -derivedDataPath ios/build/DerivedData -resultBundlePath ios/build/Tests.xcresult -parallel-testing-enabled NO CODE_SIGNING_ALLOWED=NO test 2>&1 | tee ios/build/tests.log
xcodebuild -project ios/Penny.xcodeproj -scheme Penny -configuration Release -destination 'generic/platform=iOS' -derivedDataPath ios/build/Device -archivePath ios/build/Penny.xcarchive CODE_SIGNING_ALLOWED=NO archive 2>&1 | tee ios/build/archive.log
APP=ios/build/DerivedData/Build/Products/Debug-iphonesimulator/Penny.app
xcrun simctl install "$SIMULATOR_ID" "$APP"
xcrun simctl launch "$SIMULATOR_ID" io.github.joshbeira.penny
sleep 3
xcrun simctl io "$SIMULATOR_ID" screenshot ios/build/screenshots/ios-home.png
xcrun xcresulttool export attachments --path ios/build/Tests.xcresult --output-path ios/build/screenshots/attachments || true
ditto -c -k --sequesterRsrc --keepParent "$APP" ios/build/Penny-simulator.zip
ditto -c -k --sequesterRsrc --keepParent ios/Penny.xcodeproj ios/build/Penny-project.zip
