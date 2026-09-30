package com.nailmoods.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NailMoodsBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
