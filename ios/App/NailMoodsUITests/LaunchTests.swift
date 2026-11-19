import XCTest
import UIKit
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
    private func align(_ element: XCUIElement, top: CGFloat, app: XCUIApplication) {
        for _ in 0..<4 {
            let frame = element.frame
            guard frame.width > 0 else { return }
            let delta = (frame.minY - top) / app.frame.height
            if abs(delta) < 0.012 { return }
            let fromY: CGFloat = delta > 0 ? 0.75 : 0.30
            let toY: CGFloat = delta > 0 ? max(0.20, fromY - min(delta, 0.50)) : min(0.80, fromY + min(-delta, 0.50))
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: fromY)).press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: toY)), withVelocity: .slow, thenHoldForDuration: 0.25)
            Thread.sleep(forTimeInterval: 1)
        }
    }
    func testOfficialScreens() {
        capture([("01-Accueil", "accueil", "Créer"), ("02-Collection", "collection", "Collection"), ("03-Creer", "creer", "Créer"), ("04-Mes-poses", "journal", "Mes poses"), ("05-Decouvrir", "fil", "Fil"), ("06-Espace-Pro", "profil/pro", "Créer")])
    }
    func testRetakeScreens() {
        capture(UIDevice.current.userInterfaceIdiom == .pad ? [("01-Accueil", "accueil", "Créer"), ("06-Espace-Pro", "profil/pro", "Créer")] : [("05-Decouvrir", "fil", "Fil")])
    }
    private func capture(_ screens: [(String,String,String)]) {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        for (name, route, ready) in screens {
            app.terminate()
            app.launchEnvironment = ["NM_STORE_CAPTURE": "1", "NM_STORE_ROUTE": route]
            app.launch()
            XCTAssertTrue(app.buttons[ready].firstMatch.waitForExistence(timeout: 90), "Navigation missing: " + name)
            Thread.sleep(forTimeInterval: 25)
            // StoreKit can ask for a sandbox Apple account on a fresh simulator.
            // Dismiss the system sheet; never enter or use account credentials.
            let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
            for _ in 0..<3 {
                let systemCancel = springboard.buttons["Cancel"].firstMatch
                let appCancel = app.alerts.buttons["Cancel"].firstMatch
                if systemCancel.exists { systemCancel.tap(); Thread.sleep(forTimeInterval: 2) }
                else if appCancel.exists { appCancel.tap(); Thread.sleep(forTimeInterval: 2) }
                else { break }
            }
            XCTAssertFalse(springboard.alerts.firstMatch.exists, "Unexpected SpringBoard dialog")
            XCTAssertFalse(app.alerts.firstMatch.exists, "Unexpected system dialog")
            XCTAssertFalse(app.staticTexts["Reprenons tranquillement"].exists)
            if route == "profil/pro" {
                let structure = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "2 · Structure")).firstMatch
                // Scroll the genuine WKWebView as a user would, then select the real step.
                for _ in 0..<12 {
                    if structure.exists && structure.isHittable { break }
                    app.swipeUp(velocity: .slow)
                }
                XCTAssertTrue(structure.waitForExistence(timeout: 10))
                structure.tap()
                Thread.sleep(forTimeInterval: 2)
                let solo = app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "Solo")).firstMatch
                let region = app.otherElements["Mon espace professionnel, region"].firstMatch
                if region.exists { align(region, top: app.frame.width < 500 ? 74 : 36, app: app) }
                else { align(app.staticTexts["Mon espace professionnel"].firstMatch, top: app.frame.width < 500 ? 120 : 90, app: app) }
                let diagnostic = XCTAttachment(string: app.debugDescription)
                diagnostic.name = "QA-Pro-hierarchy"
                diagnostic.lifetime = .keepAlways
                add(diagnostic)
                let proCheck = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
                proCheck.name = "QA-Pro"
                proCheck.lifetime = .keepAlways
                add(proCheck)
                XCTAssertTrue(app.staticTexts["Mon espace professionnel"].firstMatch.exists)
                XCTAssertTrue(solo.exists && solo.isHittable)
            }
            if route == "fil" && app.frame.width < 500 {
                let tabs = app.switches["Poses & inspirations"].firstMatch
                XCTAssertTrue(tabs.exists)
                align(tabs, top: 74, app: app)
                XCTAssertGreaterThanOrEqual(tabs.frame.minY, 64)
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
                let cover = app.buttons["Ouvrir Mon livre de poses"].firstMatch
                XCTAssertTrue(cover.waitForExistence(timeout: 10))
                cover.tap()
                Thread.sleep(forTimeInterval: 2)
                let spread = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
                spread.name = "QA-Livre-ouvert"
                spread.lifetime = .keepAlways
                add(spread)
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
