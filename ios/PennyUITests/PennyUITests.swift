import XCTest

final class PennyUITests: XCTestCase {
    @MainActor private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor private func launch() {
        XCUIDevice.shared.orientation = .portrait
        app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--reset-test-data"]
        app.launch()
    }

    @MainActor
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor
    private func tap(_ element: XCUIElement) {
        _ = element.waitForExistence(timeout: 2)
        for direction in [true, false] {
            for _ in 0 ..< 8 {
                if element.exists, element.isHittable {
                    element.tap(); return
                }
                if direction {
                    app.swipeUp()
                } else {
                    app.swipeDown()
                }
            }
        }
        XCTFail("Control was not reachable: \(element)")
    }

    @MainActor
    func testSampleSaveSearchReopenRelaunchAndDelete() {
        launch()
        capture("ios-home")
        tap(app.buttons["read-letter"])
        tap(app.buttons["sample-letter"])
        let editor = app.textViews["letter-text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        XCTAssertTrue((editor.value as? String ?? "").contains("Oak Street Library"))
        capture("ios-reader")
        tap(app.buttons["save-to-library"])
        tap(app.alerts.buttons["Save letter"])
        XCTAssertTrue(app.staticTexts["Saved on this device."].waitForExistence(timeout: 10))
        tap(app.tabBars.buttons["Library"])
        XCTAssertTrue(app.textFields["library-search"].waitForExistence(timeout: 5))
        capture("ios-library")
        tap(app.buttons["Add favourite"])
        XCTAssertTrue(app.buttons["Remove favourite"].waitForExistence(timeout: 5))
        let search = app.textFields["library-search"]
        tap(search)
        search.typeText("reserved")
        tap(app.buttons["Open letter"])
        XCTAssertTrue((editor.value as? String ?? "").contains("reserved"))
        app.terminate()
        app.launchArguments = ["--uitesting"]
        app.launch()
        tap(app.tabBars.buttons["Library"])
        XCTAssertTrue(app.buttons["Remove favourite"].waitForExistence(timeout: 10))
        tap(app.buttons["Delete Oak Street Library"])
        tap(app.buttons["Delete letter"])
        XCTAssertTrue(app.staticTexts["Your next letter belongs here."].waitForExistence(timeout: 10))
    }

    @MainActor
    func testPracticeRequiresConfirmationAndExportsReceipt() {
        launch()
        tap(app.buttons["Explore the banking sandbox"])
        XCTAssertTrue(app.staticTexts["simulation-notice"].exists)
        tap(app.buttons["practice-flag"])
        tap(app.buttons["Cancel"])
        tap(app.buttons["Inspect action receipts (0)"])
        XCTAssertTrue(app.staticTexts["Chain verified · 0 receipts"].exists)
        app.navigationBars.buttons.element(boundBy: 0).tap()
        tap(app.buttons["practice-flag"])
        tap(app.buttons["Confirm practice action"])
        tap(app.buttons["Inspect action receipts (1)"])
        XCTAssertTrue(app.staticTexts["Chain verified · 1 receipts"].exists)
        capture("ios-receipts")
        tap(app.buttons["Export receipts"])
        XCTAssertTrue(app.buttons["Save to Files"].waitForExistence(timeout: 5))
    }

    @MainActor
    func testCameraUnavailableAndRotationKeepReadingUsable() {
        launch()
        defer { XCUIDevice.shared.orientation = .portrait }
        tap(app.buttons["read-letter"])
        tap(app.buttons["Photograph a letter"])
        XCTAssertTrue(app.staticTexts["A camera is unavailable here. Choose a photo or paste text instead."].waitForExistence(timeout: 5))
        tap(app.buttons["sample-letter"])
        XCUIDevice.shared.orientation = .landscapeLeft
        let editor = app.textViews["letter-text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        XCTAssertTrue((editor.value as? String ?? "").contains("Oak Street Library"))
        capture("ios-landscape")
    }

    @MainActor
    func testEditingAndPreferencesPreserveUnsavedText() {
        launch()
        tap(app.buttons["read-letter"])
        let editor = app.textViews["letter-text"]
        tap(editor)
        editor.typeText("My corrected letter")
        tap(app.buttons["Done editing"])
        XCTAssertTrue(app.staticTexts["Changes are not saved yet."].exists)
        tap(app.tabBars.buttons["Settings"])
        XCTAssertTrue(app.staticTexts["Letter text size"].waitForExistence(timeout: 5))
        tap(app.buttons["text-size"])
        tap(app.buttons["Largest"])
        tap(app.switches["Quiet Mode"])
        tap(app.tabBars.buttons["Read"])
        XCTAssertEqual(editor.value as? String, "My corrected letter")
        tap(app.buttons["Read aloud"])
        XCTAssertTrue(app.staticTexts["Quiet Mode is on. Your text is ready to read on screen."].waitForExistence(timeout: 5))
    }
}
