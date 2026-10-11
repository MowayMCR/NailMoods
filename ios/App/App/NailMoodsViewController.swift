import Capacitor
import WebKit

class NailMoodsViewController: CAPBridgeViewController {
    // Install after Capacitor creates its content controller and before loadWebView.
    private func configureStoreCapture() {
        #if targetEnvironment(simulator)
        guard ProcessInfo.processInfo.environment["NM_STORE_CAPTURE"] == "1" else { return }
        guard let fixtureURL = Bundle.main.url(forResource: "fixture", withExtension: "js", subdirectory: "public"),
              let sessionURL = Bundle.main.url(forResource: "session", withExtension: "json", subdirectory: "public"),
              let fixture = try? String(contentsOf: fixtureURL, encoding: .utf8),
              let session = try? String(contentsOf: sessionURL, encoding: .utf8) else {
            fatalError("Screenshot fixtures missing; refusing capture launch")
        }
        UserDefaults.standard.set(session, forKey: "CapacitorStorage.auth:nailmoods-auth-v1")
        let route = ProcessInfo.processInfo.environment["NM_STORE_ROUTE"] ?? "accueil"
        let routeJSON = String(data: try! JSONSerialization.data(withJSONObject: [route]), encoding: .utf8)!
        let script = "window.__NM_NATIVE_CAPTURE=true;" + fixture + "\nlocation.hash=" + routeJSON + "[0];"
        webView?.configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        #endif
    }

    override func capacitorDidLoad() {
        configureStoreCapture()
        bridge?.registerPluginInstance(NailMoodsStoreKitPlugin())
        bridge?.registerPluginInstance(NailMoodsCalendarPlugin())
    }
}

import EventKit
import EventKitUI

@objc(NailMoodsCalendarPlugin)
public class NailMoodsCalendarPlugin: CAPPlugin, CAPBridgedPlugin, EKEventEditViewDelegate {
    public let identifier = "NailMoodsCalendarPlugin"
    public let jsName = "NailMoodsCalendar"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)]
    private var pending: CAPPluginCall?
    private let store = EKEventStore()
    @objc func open(_ call: CAPPluginCall) {
        // iOS 17+ presents the editor without granting app access to calendars.
        guard #available(iOS 17.0, *) else { call.reject("Utilise l’export .ics sur cette version d’iOS."); return }
        DispatchQueue.main.async {
            guard self.pending == nil, let host = self.bridge?.viewController else { call.reject("Un calendrier est déjà ouvert."); return }
            let parser = ISO8601DateFormatter()
            parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            func instant(_ value: String) -> Date? { parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; if let date = parser.date(from: value) { return date }; parser.formatOptions = [.withInternetDateTime]; return parser.date(from: value) }
            guard let title = call.getString("title"), let from = instant(call.getString("start") ?? ""), let to = instant(call.getString("end") ?? ""), to > from else { call.reject("Dates invalides."); return }
            let event = EKEvent(eventStore: self.store)
            event.title = title; event.startDate = from; event.endDate = to
            event.timeZone = TimeZone(identifier: call.getString("timezone") ?? "Europe/Paris")
            event.isAllDay = call.getBool("allDay") ?? false
            if event.isAllDay {
                let format = DateFormatter(); format.dateFormat = "yyyy-MM-dd"; format.locale = Locale(identifier: "en_US_POSIX"); format.timeZone = event.timeZone
                guard let start = format.date(from: call.getString("scheduledOn") ?? ""), let end = format.date(from: call.getString("nextDate") ?? "") else { call.reject("Jour invalide."); return }
                event.startDate = start; event.endDate = end
            }
            event.notes = call.getString("notes"); event.location = call.getString("location")
            event.url = URL(string: call.getString("url") ?? "")
            let editor = EKEventEditViewController(); editor.eventStore = self.store; editor.event = event; editor.editViewDelegate = self
            self.pending = call; host.present(editor, animated: true)
        }
    }
    public func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true)
        pending?.resolve(["opened": true, "saved": action == .saved]); pending = nil
    }
}
