package com.sentinel;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;


public class FirebaseMessaging extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Context context = getApplicationContext();

        // Handle logout action
        if (remoteMessage.getData().containsKey("action") && 
            "logout".equals(remoteMessage.getData().get("action"))) {

            Intent intent = new Intent(context, LocationService.class);
            intent.setAction(LocationService.ACTION_FCM_LOGOUT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        }

        // Handle alert action
        if (remoteMessage.getData().containsKey("type") && 
            "alert".equals(remoteMessage.getData().get("type"))) {

            long sentAt = Long.parseLong(remoteMessage.getData().get("sentAt"));
            String info = remoteMessage.getData().get("info");

            Intent intent = new Intent(context, LocationService.class);
            intent.setAction(LocationService.ACTION_FCM_ALERT);
            intent.putExtra("alert_info", info);
            intent.putExtra("sentAt", sentAt);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        }

        if (remoteMessage.getData().containsKey("type") &&
            "input_alert".equals(remoteMessage.getData().get("type"))) {

            long sentAt = Long.parseLong(remoteMessage.getData().get("sentAt"));
            String info = remoteMessage.getData().get("info");
            String name = remoteMessage.getData().get("name");

            // Start LocationService in foreground for input alert handling
            Intent serviceIntent = new Intent(context, LocationService.class);
            serviceIntent.setAction(LocationService.ACTION_FCM_INPUT_ALERT);
            serviceIntent.putExtra("alert_info", info);
            serviceIntent.putExtra("sentAt", sentAt);
            serviceIntent.putExtra("name", name);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }


        if (remoteMessage.getData().containsKey("type") &&
            "reachability_ping".equals(remoteMessage.getData().get("type"))) {

            long sentAt = Long.parseLong(remoteMessage.getData().get("sentAt"));
            String info = remoteMessage.getData().get("info");

            // Start LocationService in foreground for input alert handling
            Intent serviceIntent = new Intent(context, LocationService.class);
            serviceIntent.setAction(LocationService.ACTION_FCM_STATUS_ALERT);
            serviceIntent.putExtra("alert_info", info);
            serviceIntent.putExtra("sentAt", sentAt);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }
}
