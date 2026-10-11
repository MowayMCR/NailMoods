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
        // Cold hosted simulators can take longer to expose WKWebView accessibility.
        // Keep the real navigation assertion and preserve evidence if it never appears.
        let navigationReady = create.waitForExistence(timeout: 90)
        if !navigationReady {
            let failure = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            failure.name = "NailMoods-navigation-missing"
            failure.lifetime = .keepAlways
            add(failure)
            let hierarchy = XCTAttachment(string: app.debugDescription)
            hierarchy.name = "NailMoods-accessibility-hierarchy"
            hierarchy.lifetime = .keepAlways
            add(hierarchy)
        }
        XCTAssertTrue(navigationReady, "Expected the actual NailMoods navigation, not just the launch screen")
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


final class StoreCaptureTests: XCTestCase {
    func testOfficialScreens() {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        let screens = [("01-Accueil", "accueil", "Créer"),
                       ("02-Collection", "collection", "Collection"),
                       ("03-Creer", "creer", "Créer"),
                       ("04-Mes-poses", "journal", "Mes poses"),
                       ("05-Decouvrir", "fil", "Fil"),
                       ("06-Espace-Pro", "profil/pro", "Créer")]
        for (name, route, ready) in screens {
            app.terminate()
            app.launchEnvironment = ["NM_STORE_CAPTURE": "1", "NM_STORE_ROUTE": route]
            app.launch()
            XCTAssertTrue(app.buttons[ready].firstMatch.waitForExistence(timeout: 90), "Navigation missing: " + name)
            Thread.sleep(forTimeInterval: 5)
            XCTAssertFalse(app.staticTexts["Reprenons tranquillement"].exists)
            if route == "profil/pro" {
                XCTAssertTrue(app.staticTexts["Mon espace professionnel"].firstMatch.exists)
                XCTAssertTrue(app.buttons["Solo"].firstMatch.isHittable)
            }
            let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            shot.name = name
            shot.lifetime = .keepAlways
            add(shot)
            let hierarchy = XCTAttachment(string: app.debugDescription)
            hierarchy.name = name + "-hierarchy"
            hierarchy.lifetime = .keepAlways
            add(hierarchy)
            if route == "journal" {
                let book = app.buttons["Ouvrir mon Livre"].firstMatch
                if book.exists { book.tap(); Thread.sleep(forTimeInterval: 2) }
                let check = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
                check.name = "QA-Livre"
                check.lifetime = .keepAlways
                add(check)
            }
            if route == "creer" {
                let manual = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Composition manuelle")).firstMatch
                XCTAssertTrue(manual.exists)
                manual.tap()
                XCTAssertTrue(app.staticTexts["Ma pose, doigt par doigt"].firstMatch.waitForExistence(timeout: 10))
                Thread.sleep(forTimeInterval: 2)
                let menu = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
                menu.name = "QA-Creation"
                menu.lifetime = .keepAlways
                add(menu)
            }
        }
    }
}
