import XCTest

final class PennyUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--uitesting", "--reset-test-data"]
        app.launch()
    }

    override func tearDownWithError() throws { XCUIDevice.shared.orientation = .portrait }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func tap(_ element: XCUIElement) {
        XCTAssertTrue(element.waitForExistence(timeout: 10))
        for _ in 0..<8 {
            if element.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable)
        element.tap()
    }

    func testSampleSaveSearchReopenRelaunchAndDelete() throws {
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

    func testPracticeRequiresConfirmationAndExportsReceipt() throws {
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

    func testCameraUnavailableAndRotationKeepReadingUsable() throws {
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
}
