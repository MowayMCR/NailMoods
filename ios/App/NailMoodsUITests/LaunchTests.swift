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
        let portrait = XCTAttachment(screenshot: app.screenshot())
        portrait.name = "NailMoods-native-portrait"
        portrait.lifetime = .keepAlways
        add(portrait)
        if UIDevice.current.userInterfaceIdiom == .pad {
            XCUIDevice.shared.orientation = .landscapeLeft
            let wide = NSPredicate { _, _ in app.windows.firstMatch.frame.width > app.windows.firstMatch.frame.height }
            expectation(for: wide, evaluatedWith: app.windows.firstMatch)
            waitForExpectations(timeout: 10)
            XCTAssertTrue(create.exists)
            let landscape = XCTAttachment(screenshot: app.screenshot())
            landscape.name = "NailMoods-native-landscape"
            landscape.lifetime = .keepAlways
            add(landscape)
        }
    }
}
