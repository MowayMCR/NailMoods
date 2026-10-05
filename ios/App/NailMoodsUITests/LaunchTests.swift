import XCTest
import UIKit

final class LaunchTests: XCTestCase {
    func testNativeLaunchAndSupportedOrientations() {
        continueAfterFailure = false
        let app = XCUIApplication()
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        let create = app.buttons["Créer"].firstMatch
        XCTAssertTrue(create.waitForExistence(timeout: 30), "Expected the actual NailMoods navigation, not just the launch screen")
        let portrait = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        portrait.name = "NailMoods-native-portrait"
        portrait.lifetime = .keepAlways
        add(portrait)
        if UIDevice.current.userInterfaceIdiom == .pad {
            XCUIDevice.shared.orientation = .landscapeLeft
            let wide = NSPredicate { _, _ in app.windows.firstMatch.frame.width > app.windows.firstMatch.frame.height }
            expectation(for: wide, evaluatedWith: app.windows.firstMatch)
            waitForExpectations(timeout: 10)
            XCTAssertTrue(create.exists)
            // UIKit updates the frame before the rotation animation finishes.
            Thread.sleep(forTimeInterval: 2)
            let shot = XCUIScreen.main.screenshot()
            XCTAssertGreaterThan(shot.image.size.width, shot.image.size.height)
            let landscape = XCTAttachment(screenshot: shot)
            landscape.name = "NailMoods-native-landscape"
            landscape.lifetime = .keepAlways
            add(landscape)
        }
    }
}
