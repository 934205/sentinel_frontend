package com.sentinel;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.content.Intent;
import java.util.ArrayList;
import java.util.List;
import android.util.Log;
import android.content.Context;
import android.content.SharedPreferences;


public class PersistentLocationModule extends ReactContextBaseJavaModule {

    private static ReactContext reactContext;
    private static boolean jsReady = false;
    private static final List<WritableMap> eventQueue = new ArrayList<>();
    private static final String EVENT_NAME = "onLocationUpdate";
    private static final String TAG = "RN_Module"; // Added TAG for logging

    public PersistentLocationModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "PersistentLocationModule";
    }


    @ReactMethod
    public void getRegNo(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext().getSharedPreferences("user_prefs", Context.MODE_PRIVATE);
            String regNo = prefs.getString("reg_no", null);
            promise.resolve(regNo);
        } catch (Exception e) {
            promise.reject("GET_REGNO_FAILED", e);
        }
    }


    @ReactMethod
    public void setRegNo(String regNo) {
        SharedPreferences prefs = reactContext.getSharedPreferences("user_prefs", Context.MODE_PRIVATE);
        prefs.edit().putString("reg_no", regNo).apply();
        SharedPreferences no_delete_prefs = reactContext.getSharedPreferences("no_delete_user_prefs", Context.MODE_PRIVATE);
        no_delete_prefs.edit().putString("reg_no", regNo).apply();
    }

    @ReactMethod
    public void getLastLocation(Promise promise) {
        try {
            SharedPreferences prefs = reactContext.getSharedPreferences("user_prefs", Context.MODE_PRIVATE);

            String latStr = prefs.getString("lastLat", "0");
            String lonStr = prefs.getString("lastLon", "0");
            boolean insideRegion = prefs.getBoolean("insideRegion", false);
            String entryTime = prefs.getString("entryTime", "-");

            double lastLat = Double.parseDouble(latStr);
            double lastLon = Double.parseDouble(lonStr);


            WritableMap map = Arguments.createMap();
            map.putDouble("latitude", lastLat);
            map.putDouble("longitude", lastLon);
            map.putBoolean("insideRegion", insideRegion);
            map.putString("entryTime", entryTime);

            promise.resolve(map);

        } catch (Exception e) {
            promise.reject("ERROR_GETTING_LOCATION", e);
        }
    }



    @ReactMethod
    public void startService() {
        // ... (Service start logic remains the same) ...
        Intent intent = new Intent(reactContext, LocationService.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent);
        } else {
            reactContext.startService(intent);
        }
    }

    @ReactMethod
    public void stopService() {
        // ... (Service stop logic remains the same) ...
        reactContext.stopService(new Intent(reactContext, LocationService.class));
    }

}