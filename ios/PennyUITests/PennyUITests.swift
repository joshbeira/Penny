import CoreGraphics
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
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor
    private func tap(_ element: XCUIElement) {
        _ = element.waitForExistence(timeout: 2)
        for direction in [true, false] {
            for _ in 0 ..< 8 {
                let page = app.scrollViews["page-scroll"].firstMatch
                if element.exists, element.isHittable {
                    let key = element.identifier.isEmpty ? element.label : element.identifier
                    let isPageControl = page.exists && page.descendants(matching: element.elementType).matching(identifier: key).firstMatch.exists
                    let center = CGPoint(x: element.frame.midX, y: element.frame.midY)
                    // A sliver can be hittable while XCTest taps the centre
                    // beneath a fixed banner. Reveal the actual tap point.
                    if !isPageControl || visibleFrame(page).contains(center) {
                        element.tap(); return
                    }
                }
                let target: XCUIElement = page.exists ? page : app
                let bounds = element.exists ? element.frame : .zero
                let up = bounds.height > 0 ? bounds.midY > visibleFrame(target).midY : direction
                scroll(target, up: up)
            }
        }
        capture("unreachable-control")
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "unreachable-control-hierarchy"
        hierarchy.lifetime = .keepAlways
        add(hierarchy)
        XCTFail("Control was not reachable: \(element)")
    }

    @MainActor
    private func visibleFrame(_ page: XCUIElement) -> CGRect {
        let frame = page.frame
        var top = frame.minY + 16
        var bottom = frame.maxY - 24
        let navigation = app.navigationBars.firstMatch
        if navigation.exists {
            top = max(top, navigation.frame.maxY + 8)
        }
        let dismiss = app.buttons["Dismiss message"].firstMatch
        if dismiss.exists {
            top = max(top, dismiss.frame.maxY + 8)
        }
        let tabs = app.tabBars.firstMatch
        if tabs.exists {
            bottom = min(bottom, tabs.frame.minY - 8)
        }
        let keyboard = app.keyboards.firstMatch
        if keyboard.exists {
            bottom = min(bottom, keyboard.frame.minY - 8)
        }
        return CGRect(x: frame.minX, y: top, width: frame.width, height: max(0, bottom - top))
    }

    @MainActor
    private func scroll(_ page: XCUIElement, up: Bool) {
        // SwiftUI's scroll view frame includes the fixed bars. Keep both ends
        // inside the visible page and the gutter outside nested text editors.
        let frame = page.frame
        let visible = visibleFrame(page)
        guard visible.height >= 40, frame.height > 0 else {
            XCTFail("No visible document area for a scroll gesture."); return
        }
        let dx: CGFloat = frame.width > frame.height ? 0.1 : 0.025
        let low = page.coordinate(withNormalizedOffset: CGVector(dx: dx, dy: (visible.minY + visible.height * 0.8 - frame.minY) / frame.height))
        let high = page.coordinate(withNormalizedOffset: CGVector(dx: dx, dy: (visible.minY + visible.height * 0.2 - frame.minY) / frame.height))
        let start = up ? low : high
        let end = up ? high : low
        start.press(forDuration: 0.05, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.1)
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
        tap(app.buttons["practice-presentation"])
        tap(app.buttons["Listen"])
        XCTAssertTrue(app.staticTexts["Listen at your pace"].waitForExistence(timeout: 5))
        tap(app.buttons["practice-flag"])
        tap(app.buttons["Cancel"])
        tap(app.buttons["Inspect action receipts (0)"])
        XCTAssertTrue(app.staticTexts["Chain verified · 0 receipts"].exists)
        app.navigationBars.buttons.element(boundBy: 0).tap()
        tap(app.buttons["practice-flag"])
        tap(app.buttons["Confirm practice action"])
        tap(app.buttons["Inspect action receipts (1)"])
        XCTAssertTrue(app.staticTexts["Chain verified · 1 receipt"].exists)
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
        app.activate()
        XCTAssertEqual(app.state, .runningForeground)
        let editor = app.textViews["letter-text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        XCTAssertTrue((editor.value as? String ?? "").contains("Oak Street Library"))
        // Interact after rotating so this checks a usable layout, not just
        // the existence of an editor retained from the portrait screen.
        tap(editor)
        editor.typeText(" Updated after rotation.")
        tap(app.buttons["Done editing"])
        XCTAssertTrue((editor.value as? String ?? "").contains("Updated after rotation."))
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
        XCTAssertEqual(app.switches["Quiet Mode"].value as? String, "1")
        tap(app.tabBars.buttons["Read"])
        XCTAssertEqual(editor.value as? String, "My corrected letter")
        tap(app.buttons["Read aloud"])
        XCTAssertTrue(app.staticTexts["Quiet Mode is on. Your text is ready to read on screen."].waitForExistence(timeout: 5))
    }
}
