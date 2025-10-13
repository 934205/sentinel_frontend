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

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

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

    private static final String TAG = "LocationService";
    private static final String CHANNEL_ID = "sentinel_tracking_channel";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private SharedPreferences sharedPreferences;

    @Override
    public void onCreate() {

        super.onCreate();

        sharedPreferences = getSharedPreferences("user_prefs", MODE_PRIVATE);

        createNotificationChannel();
        // Changed to a system drawable for reliability if R.drawable.ic_notification is missing
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
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Foreground service for location tracking");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification getNotification(String content) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("SentinelShield")
                .setContentText(content)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation) // Using system icon
                .setOngoing(true)
                .build();
    }

    private void checkBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = getSystemService(PowerManager.class);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                // NOTE: Starting an activity from a service is generally bad practice and may fail.
                // It's usually better to prompt the user from the React Native UI.
                // try { startActivity(intent); } catch (Exception ignored) {} 
            }
        }
    }

    private void setupLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null) return;
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
            request = new LocationRequest.Builder(TimeUnit.SECONDS.toMillis(10)) 
                    .setMinUpdateIntervalMillis(TimeUnit.SECONDS.toMillis(5))
                    .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY)
                    .build();
        } else {
            request = LocationRequest.create()
                    .setInterval(10000)
                    .setFastestInterval(5000)
                    .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
        }

        try {
            // Priority.PRIORITY_HIGH_ACCURACY is used in your second block, 
            // but LocationRequest.PRIORITY_HIGH_ACCURACY is the correct constant for older APIs.
            // Using LocationRequest.PRIORITY_HIGH_ACCURACY for both for compatibility/simplicity.
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

        // Save Location
        saveLastLocation(latitude, longitude);

        // Geofencing Logic
        // 'inside' variable declaration
        boolean inside = isInsideTriangle(latitude, longitude, Config.A, Config.B, Config.C); 
        boolean wasInside = sharedPreferences.getBoolean("insideRegion", false);
        sharedPreferences.edit().putBoolean("insideRegion", inside).apply();

        //🛑 GUARD 4: Reg No Check
        String regNo = sharedPreferences.getString("reg_no", null);
        Log.e("Regno",regNo);
        if (regNo == null) {
            Log.e(TAG, "🚫 Skipped location: reg_no not found in SharedPreferences.");
            return; 
        }

        // ... (rest of API calls)
        if (inside && !wasInside) {
            // User just entered region
            String entryTime = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());

            // Store in SharedPreferences (so later updates can reuse it)
            sharedPreferences.edit().putString("entryTime", entryTime).apply();

            // Send to RN with entryTime
            sendLocationToJS(latitude, longitude, inside, entryTime);
            
            callEntryAPI(regNo, latitude, longitude, entryTime);


        }
        else {
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
        String channelId = "tracking_channel";
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.drawable.ic_notification) // or your custom icon
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);

        NotificationManagerCompat manager = NotificationManagerCompat.from(this);
        manager.notify((int) System.currentTimeMillis(), builder.build());
    }



    // --- API and Geofencing Helper Methods (Unchanged from your second block) ---

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
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(obj.toString().getBytes("utf-8"));
                }

                int code = conn.getResponseCode();

                if (code == 200 || code == 201) {
                    Log.i(TAG, "✅ Entry API Response: " + code);
                    String formattedTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                    showNotification("Entry Logged ✅", "Entry time: " + formattedTime);
                } else {
                    Log.e(TAG, "❌ Entry API failed, code: " + code);
                }

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "❌ Entry API failed", e);
            }
        }).start();
    }


        private void callExitAPI(String regNo, double lat, double lon) {
        new Thread(() -> {
            try {
                JSONObject obj = new JSONObject();
                obj.put("reg_no", regNo);
                obj.put("latitude", lat);
                obj.put("longitude", lon);

                URL url = new URL(Config.EXIT_API);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(obj.toString().getBytes("utf-8"));
                }

                int code = conn.getResponseCode();

                if (code == 200 || code == 201) {
                    Log.i(TAG, "✅ Exit API Response: " + code);
                    String formattedTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                    showNotification("Exit Logged ✅", "Exit time: " + formattedTime);
                } else {
                    Log.e(TAG, "❌ Exit API failed, code: " + code);
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
        double a = Math.sin(dLat/2)*Math.sin(dLat/2) +
                Math.cos(Math.toRadians(lat1))*Math.cos(Math.toRadians(lat2))*
                        Math.sin(dLon/2)*Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    private boolean isInsideTriangle(double lat, double lon, com.sentinel.GeoPoint A, com.sentinel.GeoPoint B, com.sentinel.GeoPoint C) {
        double d1 = sign(lon, lat, A.longitude, A.latitude, B.longitude, B.latitude);
        double d2 = sign(lon, lat, B.longitude, B.latitude, C.longitude, C.latitude);
        double d3 = sign(lon, lat, C.longitude, C.latitude, A.longitude, A.latitude);
        boolean hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        boolean hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        return !(hasNeg && hasPos);
    }

    private double sign(double px, double py, double ax, double ay, double bx, double by) {
        return (px - bx)*(ay - by) - (ax - bx)*(py - by);
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
        // START_STICKY is correct for services that should be restarted by the system
        return START_STICKY; 
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }

        Intent broadcastIntent = new Intent(this, RestartReceiver.class);
        sendBroadcast(broadcastIntent);
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
}

