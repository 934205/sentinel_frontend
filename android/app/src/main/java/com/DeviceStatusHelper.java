package com.sentinel;


import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.BatteryManager;
import android.os.Build;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class DeviceStatusHelper {

    private Context context;

    public DeviceStatusHelper(Context context) {
        this.context = context;
    }

    // ✅ 1. Get Battery Percentage
    public int getBatteryPercentage() {
        IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        Intent batteryStatus = context.registerReceiver(null, filter);
        if (batteryStatus == null)
            return -1;

        int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        if (level == -1 || scale == -1)
            return -1;

        return (int) ((level / (float) scale) * 100);
    }

    // ✅ 2. Check if GPS is enabled
    public boolean isGpsEnabled() {
        LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (locationManager == null)
            return false;
        return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
    }

    // ✅ 3. Check if Internet is available
    public boolean isInternetAvailable() {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null)
            return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.net.NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
            return nc != null && (nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)
                    || nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR));
        } else {
            NetworkInfo ni = cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        }
    }

    // ✅ 4. Send status to backend
    public void sendStatusToServer(String regNo, boolean gps, boolean internet, int battery, long timestamp) {
        new Thread(() -> {
            HttpURLConnection conn = null;

            try {

                JSONObject obj = new JSONObject();
                obj.put("reg_no", regNo);
                obj.put("gps_status", gps ? "on" : "off");
                obj.put("internet_status", internet ? "on" : "off");
                obj.put("battery_percentage", battery);
                obj.put("timestamp", timestamp);

                Log.d("LocationService",regNo);
                Log.d("LocationService",String.valueOf(gps));
                Log.d("LocationService",String.valueOf(internet));
                Log.d("LocationService",String.valueOf(battery));
                Log.d("LocationService",String.valueOf(timestamp));

                URL url = new URL(Config.ALERT_DEVICE_RESPONSE_API);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);

                byte[] data = obj.toString().getBytes("utf-8");
                conn.setRequestProperty("Content-Length", String.valueOf(data.length));

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(data);
                    os.flush(); // 🔹 important to send the data
                }

                int responseCode = conn.getResponseCode();
                Log.i("HTTP", "Response code: " + responseCode);
            } catch (Exception e) {
                Log.e("SendStatus", "Error sending status", e);
            } finally {
                if (conn != null)
                    conn.disconnect();
            }
        }).start();
    }
}
