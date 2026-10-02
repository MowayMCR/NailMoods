import Capacitor

class NailMoodsViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NailMoodsStoreKitPlugin())
    }
}
