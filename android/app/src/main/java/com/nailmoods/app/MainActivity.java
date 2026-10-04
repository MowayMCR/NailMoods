package com.nailmoods.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NailMoodsBillingPlugin.class);
        registerPlugin(NailMoodsCalendarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
