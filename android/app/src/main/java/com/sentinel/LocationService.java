package com.sentinel;

import android.app.*;
import android.content.Intent;
import android.location.Location;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.util.Log;
import android.content.SharedPreferences;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Timer;
import java.util.TimerTask;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.android.gms.location.*;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

// NOTE: You must ensure MainApplication.java, Config.java, and GeoPoint.java are correctly implemented.

public class LocationService extends Service {

    public static final String TAG = "LocationService";
    public static final String CHANNEL_ID = "sentinel_tracking_channel";
    public static final String PREF_EXIT_EVENTS = "offline_exit_events";
    public static final String ACTION_FCM_ALERT = "ACTION_FCM_ALERT";
    public static final String ACTION_FCM_LOGOUT = "ACTION_FCM_LOGOUT";
    public static final String ACTION_FCM_INPUT_ALERT = "ACTION_FCM_INPUT_ALERT";
    public static final String ACTION_FCM_STATUS_ALERT = "ACTION_FCM_STATUS_ALERT";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private SharedPreferences sharedPreferences;

    @Override
    public void onCreate() {

        super.onCreate();

        sharedPreferences = getSharedPreferences("user_prefs", MODE_PRIVATE);

        createNotificationChannel();
        // Changed to a system drawable for reliability if R.drawable.ic_notification is
        // missing
        startForeground(1, getNotification("Tracking Active"));

        checkBatteryOptimization();

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        setupLocationCallback();
        startLocationUpdates();

        Log.i(TAG, "✅ LocationService started successfully");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Persistent Location Service",
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Foreground service for location tracking");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null)
                manager.createNotificationChannel(channel);
        }
    }

    private Notification getNotification(String content) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("SentinelShield")
                .setContentText(content)
                .setSmallIcon(R.drawable.ic_notification) // Using system icon
                .setOngoing(true)
                .build();
    }

    private void checkBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = getSystemService(PowerManager.class);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent); // Prompt user to allow ignore battery optimization
                    Log.i(TAG, "🔋 Requested to ignore battery optimizations");
                } catch (Exception e) {
                    Log.e(TAG, "❌ Failed to request battery optimization ignore", e);
                }
            } else {
                Log.i(TAG, "✅ Already ignoring battery optimizations");
            }
        }
    }

    private void setupLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null)
                    return;
                for (Location loc : result.getLocations()) {
                    handleLocation(loc);
                }
            }
        };
    }

    private void startLocationUpdates() {
        LocationRequest request;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Using TimeUnit for clearer intent, matching the spirit of the original
            request = new LocationRequest.Builder(TimeUnit.MINUTES.toMillis(1))
                    .setMinUpdateIntervalMillis(TimeUnit.SECONDS.toMillis(30))
                    .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY)
                    .build();
        } else {
            request = LocationRequest.create()
                    .setInterval(60000)
                    .setFastestInterval(30000)
                    .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
        }

        try {
            // Priority.PRIORITY_HIGH_ACCURACY is used in your second block,
            // but LocationRequest.PRIORITY_HIGH_ACCURACY is the correct constant for older
            // APIs.
            // Using LocationRequest.PRIORITY_HIGH_ACCURACY for both for
            // compatibility/simplicity.
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
            Log.i(TAG, "📡 Started requesting location updates");
        } catch (SecurityException e) {
            Log.e(TAG, "❌ Missing location permission", e);
        }
    }

    private void handleLocation(Location location) {
        // 🏆 CRITICAL FIX: Ensure all variables are declared and initialized here
        double latitude = location.getLatitude();
        double longitude = location.getLongitude();
        float accuracy = location.getAccuracy();

        Log.i(TAG, "📍 Received Location: Lat=" + latitude + ", Lon=" + longitude + ", Accuracy=" + accuracy);

        // 🛑 GUARD 1: Accuracy Check (Uses the declared 'accuracy')
        // NOTE: Requires Config.java
        if (accuracy > Config.ACCURACY_THRESHOLD) {
            Log.w(TAG, "🚫 Skipped location: Accuracy too low (" + accuracy + ")");
            return;
        }

        // 🛑 GUARD 2 & 3: Distance Checks
        com.sentinel.GeoPoint last = getLastLocation();
        if (last != null) {
            // Uses declared 'latitude' and 'longitude'
            double dist = haversineDistance(last.latitude, last.longitude, latitude, longitude);

            if (dist < Config.MIN_DISTANCE_METERS) {
                Log.w(TAG, "🚫 Skipped location: Distance too small (" + dist + ")");
                return;
            }
            if (dist > Config.MAX_JUMP_DISTANCE) {
                Log.w(TAG, "🚫 Skipped location: Distance too large/jump (" + dist + ")");
                return;
            }
        }

        // ✅ Auto-sync offline exits when internet returns
        if (isInternetAvailable()) {
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            JSONObject offlineExit = getOfflineExitEvent(today);
            if (offlineExit != null) {
                try {
                    String regNoOffline = offlineExit.getString("reg_no");
                    double latOffline = offlineExit.getDouble("latitude");
                    double lonOffline = offlineExit.getDouble("longitude");
                    String dateOffline = offlineExit.getString("date");
                    String timeOffline = offlineExit.getString("time");

                    Log.i(TAG, "🌐 Internet restored. Sending offline exit for " + regNoOffline);
                    callOfflineExitAPI(regNoOffline, latOffline, lonOffline, dateOffline, timeOffline);
                    clearOfflineExitEvent(today);

                } catch (Exception e) {
                    Log.e(TAG, "❌ Error syncing offline exit", e);
                }
            }
        }

        // Save Location
        saveLastLocation(latitude, longitude);

        // Geofencing Logic
        // 'inside' variable declaration
        boolean inside = isInsideTriangle(latitude, longitude, Config.A, Config.B, Config.C);
        boolean wasInside = sharedPreferences.getBoolean("insideRegion", false);
        sharedPreferences.edit().putBoolean("insideRegion", inside).apply();

        if (sharedPreferences == null)
            return;

        // 🛑 GUARD 4: Reg No Check
        String regNo = sharedPreferences.getString("reg_no", null);
        Log.e("Regno", "Value: " + (regNo != null ? regNo : "null"));
        if (regNo == null) {
            Log.e(TAG, "🚫 Skipped location: reg_no not found in SharedPreferences.");
            return;
        }

        // ... (rest of API calls)
        if (inside && !wasInside) {

            sendLocationToJS(latitude, longitude, inside, "-");

            attemptEntry(regNo, latitude, longitude);

        } else {
            // Still inside OR outside region: send stored entryTime if exists
            String storedEntryTime = sharedPreferences.getString("entryTime", "-");
            sendLocationToJS(latitude, longitude, inside, storedEntryTime);

            // Optional: callExitAPI if leaving
            if (!inside && wasInside) {
                callExitAPI(regNo, latitude, longitude);
            }
        }
    }

    // ⭐ THE KEY FIX: Reliable React Native Event Emission (from the first block)
    private void sendLocationToJS(double lat, double lon, boolean inside, String timestamp) {
        try {
            if (getApplication() instanceof MainApplication) {
                MainApplication app = (MainApplication) getApplication();

                // CRITICAL CHECK: Ensure the React Native bridge/context is active
                if (app.getReactNativeHost().getReactInstanceManager().getCurrentReactContext() != null) {

                    WritableMap map = Arguments.createMap();
                    map.putDouble("latitude", lat);
                    map.putDouble("longitude", lon);
                    map.putBoolean("insideRegion", inside);
                    map.putString("entryTime", timestamp);

                    // Emission via the direct ReactContext reference
                    app.getReactNativeHost().getReactInstanceManager()
                            .getCurrentReactContext()
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("onLocationUpdate", map);

                    Log.i(TAG, "📲 Sent location to React Native via direct context access.");
                }
            }
        } catch (Exception e) {
            // This happens when the JS thread is killed or hasn't started yet.
            Log.w(TAG, "❌ Failed to send event to RN. ReactContext not ready: " + e.getMessage());
        }
    }

    private void showNotification(String title, String message) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification) // or your custom icon
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);

        NotificationManagerCompat manager = NotificationManagerCompat.from(this);
        manager.notify((int) System.currentTimeMillis(), builder.build());
    }

    // --- API and Geofencing Helper Methods (Unchanged from your second block) ---

    private void attemptEntry(final String regNo, final double latitude, final double longitude) {
        new Thread(() -> {
            try {
                // 1️⃣ Call checkTodayEntry API
                URL checkUrl = new URL(Config.CHECK_ENTRY_API + "/" + regNo);
                HttpURLConnection checkConn = (HttpURLConnection) checkUrl.openConnection();
                checkConn.setRequestMethod("GET");
                checkConn.setRequestProperty("Accept", "application/json");

                int checkCode = checkConn.getResponseCode();
                if (checkCode == 200) {
                    BufferedReader reader = new BufferedReader(
                            new InputStreamReader(checkConn.getInputStream(), "utf-8"));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        response.append(line);
                    }
                    reader.close();

                    JSONObject jsonResponse = new JSONObject(response.toString());
                    boolean hasEntry = jsonResponse.getBoolean("hasEntry");

                    if (!hasEntry) {
                        // 2️⃣ No entry yet, create new entry
                        String entryTime = new SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                                .format(new Date());
                        sharedPreferences.edit().putString("entryTime", entryTime).apply();

                        // Send to RN
                        sendLocationToJS(latitude, longitude, true, entryTime);

                        // Call logLocation API (entry)
                        callEntryAPI(regNo, latitude, longitude, entryTime);

                    } else {
                        // 3️⃣ Already entered today
                        Log.i(TAG, "✅ Entry already exists for today");

                        String storedEntryTime = sharedPreferences.getString("entryTime", "-");

                        // Send stored entry time to RN
                        sendLocationToJS(latitude, longitude, true, storedEntryTime);
                    }

                } else {
                    Log.e(TAG, "❌ CheckAttendance API failed, code: " + checkCode);
                }

                checkConn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "❌ Error calling CheckAttendance API", e);
            }
        }).start();
    }

    private void callEntryAPI(String regNo, double lat, double lon, String entryTime) {
        new Thread(() -> {
            try {
                JSONObject obj = new JSONObject();
                obj.put("reg_no", regNo);
                obj.put("latitude", lat);
                obj.put("longitude", lon);
                obj.put("entry_time", entryTime);
                obj.put("is_present", true);
                obj.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date()));

                URL url = new URL(Config.ENTRY_API);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
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

                if (responseCode == 200 || responseCode == 201) {
                    Log.i(TAG, "✅ Entry API Response: " + responseCode);
                    String formattedTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                    showNotification("Entry Logged ✅", "Entry time: " + formattedTime);
                } else {
                    Log.e(TAG, "❌ Entry API failed, code: " + responseCode);
                }

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "❌ Entry API failed", e);
            }
        }).start();
    }

    private void callExitAPI(String regNo, double lat, double lon) {

        if (!isInternetAvailable()) {
            saveExitEventOffline(regNo, lat, lon);
            return;
        }

        new Thread(() -> {
            try {
                JSONObject obj = new JSONObject();
                obj.put("reg_no", regNo);
                obj.put("latitude", lat);
                obj.put("longitude", lon);

                URL url = new URL(Config.EXIT_API);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
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

                if (responseCode == 200 || responseCode == 201) {
                    Log.i(TAG, "✅ Exit API Response: " + responseCode);
                    String formattedTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                    showNotification("Exit Logged ✅", "Exit time: " + formattedTime);
                    performFCMLogout();
                } else {
                    Log.e(TAG, "❌ Exit API failed, code: " + responseCode);
                }

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "❌ Exit API failed", e);
            }
        }).start();
    }

    private void callOfflineExitAPI(String regNo, double lat, double lon, String date, String time) {

        new Thread(() -> {
            try {
                JSONObject obj = new JSONObject();
                obj.put("reg_no", regNo);
                obj.put("latitude", lat);
                obj.put("longitude", lon);
                obj.put("date", date);
                obj.put("time", time);

                URL url = new URL(Config.EXIT_OFFLINE_API);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
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

                if (responseCode == 200 || responseCode == 201) {
                    Log.i(TAG, "✅ Exit API Response: " + responseCode);
                    String formattedTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                    showNotification("Exit Logged ✅", "Exit time: " + formattedTime + "Date: " + date);
                    performFCMLogout();
                } else {
                    Log.e(TAG, "❌ Exit API failed, code: " + responseCode);
                }

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "❌ Exit API failed", e);
            }
        }).start();
    }

    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private boolean isInsideTriangle(double lat, double lon, com.sentinel.GeoPoint A, com.sentinel.GeoPoint B,
            com.sentinel.GeoPoint C) {
        double d1 = sign(lon, lat, A.longitude, A.latitude, B.longitude, B.latitude);
        double d2 = sign(lon, lat, B.longitude, B.latitude, C.longitude, C.latitude);
        double d3 = sign(lon, lat, C.longitude, C.latitude, A.longitude, A.latitude);
        boolean hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        boolean hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        return !(hasNeg && hasPos);
    }

    private double sign(double px, double py, double ax, double ay, double bx, double by) {
        return (px - bx) * (ay - by) - (ax - bx) * (py - by);
    }

    private void saveLastLocation(double lat, double lon) {
        sharedPreferences.edit()
                .putString("lastLat", String.format(Locale.US, "%.6f", lat))
                .putString("lastLon", String.format(Locale.US, "%.6f", lon))
                .apply();
    }

    private com.sentinel.GeoPoint getLastLocation() {
        if (!sharedPreferences.contains("lastLat") || !sharedPreferences.contains("lastLon")) {
            return null;
        }
        double lat = Double.parseDouble(sharedPreferences.getString("lastLat", "0"));
        double lon = Double.parseDouble(sharedPreferences.getString("lastLon", "0"));
        return new com.sentinel.GeoPoint(lat, lon);
    }

    // --- Service Lifecycle Methods ---

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_FCM_ALERT.equals(action)) {
                String info = intent.getStringExtra("alert_info");
                long sentAt = intent.getLongExtra("sentAt", System.currentTimeMillis());
                handleFCMAlert(sentAt, info);
            } else if (ACTION_FCM_LOGOUT.equals(action)) {
                performFCMLogout();
                // Service should not restart after logout
                return START_NOT_STICKY;
            } else if (ACTION_FCM_INPUT_ALERT.equals(action)) {
                String info = intent.getStringExtra("alert_info");
                String name = intent.getStringExtra("name");
                long sentAt = intent.getLongExtra("sentAt", System.currentTimeMillis());
                handleFCMInputAlert(sentAt, info, name);
            } else if (ACTION_FCM_STATUS_ALERT.equals(action)) {
                String info = intent.getStringExtra("alert_info");
                long sentAt = intent.getLongExtra("sentAt", System.currentTimeMillis());
                performCheckOperation(sentAt, info);
            }
        }

        // Normal location tracking continues only for active sessions
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();

        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }

        boolean isLogout = sharedPreferences.getBoolean("isLogout", false);
        if (!isLogout) {
            sendBroadcast(new Intent(this, RestartReceiver.class));
        } else {
            Log.i(TAG, "🚫 Service not restarted — logout detected");
            sharedPreferences.edit().putBoolean("isLogout", false).apply();
        }
    }

    private void restartService() {
        Intent intent = new Intent(this, LocationService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void performFCMLogout() {
        try {
            // ✅ Mark logout before clearing data
            sharedPreferences.edit().putBoolean("isLogout", true).apply();

            // Stop location updates
            if (fusedLocationClient != null && locationCallback != null) {
                fusedLocationClient.removeLocationUpdates(locationCallback);
                fusedLocationClient = null;
                locationCallback = null;
            }

            // ✅ Stop service immediately
            stopForeground(true);
            stopSelf();

            // ✅ Now clear other data, but keep isLogout flag
            SharedPreferences.Editor editor = sharedPreferences.edit();
            editor.remove("reg_no");
            editor.remove("lastLat");
            editor.remove("lastLon");
            editor.remove("insideRegion");
            editor.remove("entryTime");
            editor.apply();

            Log.d(TAG, "✅ Logout performed successfully via FCM");
        } catch (Exception e) {
            Log.e(TAG, "❌ Logout failed via FCM", e);
        }
    }

    private void handleFCMAlert(long sentAt, String info) {
        NotificationHelper.showNotification(
                this,
                "Alert",
                info,
                sentAt);
    }

    private void handleFCMInputAlert(long sentAt, String info, String name) {

        // Show persistent input notification using NotificationHelper
        NotificationHelper.showPersistentInputNotification(
                this,
                "Reply Required", // Notification title
                info, // Notification message
                sentAt, // Unique ID
                "reply_key_" + sentAt, // RemoteInput key
                name);
    }

    private void performCheckOperation(long sentAt, String info) {
        DeviceStatusHelper helper = new DeviceStatusHelper(getApplicationContext());

        int battery = helper.getBatteryPercentage();
        boolean gps = helper.isGpsEnabled();
        boolean internet = helper.isInternetAvailable();

        String regNo = sharedPreferences.getString("reg_no", null);

        if (regNo != null) {
            helper.sendStatusToServer(regNo, gps, internet, battery, sentAt);
        }
    }

    private void saveExitEventOffline(String regNo, double lat, double lon) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREF_EXIT_EVENTS, MODE_PRIVATE);

            String date = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            String time = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());

            JSONObject obj = new JSONObject();
            obj.put("reg_no", regNo);
            obj.put("latitude", lat);
            obj.put("longitude", lon);
            obj.put("date", date);
            obj.put("time", time);

            prefs.edit().putString(date, obj.toString()).apply();

            Log.i(TAG, "💾 Saved offline exit event for " + date + " : " + obj);
            showNotification("Offline", "Exit stored locally. Will sync when online.");

        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to save offline exit event", e);
        }
    }

    private JSONObject getOfflineExitEvent(String date) {
        SharedPreferences prefs = getSharedPreferences(PREF_EXIT_EVENTS, MODE_PRIVATE);
        try {
            String data = prefs.getString(date, null);
            return data != null ? new JSONObject(data) : null;
        } catch (Exception e) {
            Log.e(TAG, "❌ Error parsing offline exit JSON", e);
            return null;
        }
    }

    private void clearOfflineExitEvent(String date) {
        SharedPreferences prefs = getSharedPreferences(PREF_EXIT_EVENTS, MODE_PRIVATE);
        prefs.edit().remove(date).apply();
        Log.i(TAG, "🧹 Cleared offline exit for " + date);
    }

    public boolean isInternetAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null)
            return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
            return nc != null && (nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                    || nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                    || nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
        } else {
            NetworkInfo ni = cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        }
    }

}
