package com.sentinel;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.Bundle;
import android.util.Log;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.HashMap;
import java.util.Map;
import androidx.core.app.RemoteInput;
import android.content.Context;
import android.content.SharedPreferences;

public class NotificationHelper {

    private static final Map<Long, Runnable> clickCallbacks = new HashMap<>();
    private static final Map<Long, Handler> autoCancelHandlers = new HashMap<>();
    private static final Map<Long, MediaPlayer> mediaPlayers = new HashMap<>();
    public static final String TAG = "LocationService";


    public static void showNotification(Context context, String title, String message, long timestamp) {
        String channelId = "persistent_channel_" + timestamp;
        createChannel(context, channelId);

        Intent clickIntent = new Intent(context, NotificationClickReceiver.class);
        clickIntent.putExtra("timestamp", timestamp);

        PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            pendingIntent = PendingIntent.getBroadcast(context, (int) timestamp, clickIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        } else {
            pendingIntent = PendingIntent.getBroadcast(context, (int) timestamp, clickIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setSmallIcon(R.drawable.ic_notification)
                .setAutoCancel(false)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        manager.notify((int) timestamp, builder.build());

        try {
            MediaPlayer mediaPlayer = new MediaPlayer();
            Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.alert_sound);
            mediaPlayer.setDataSource(context, soundUri);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
            } else {
                mediaPlayer.setAudioStreamType(android.media.AudioManager.STREAM_ALARM);
            }

            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
            mediaPlayers.put(timestamp, mediaPlayer);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Auto cancel after 1 min
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            manager.cancel((int) timestamp);
            MediaPlayer mp = mediaPlayers.remove(timestamp);
            if (mp != null) {
                mp.stop();
                mp.release();
            }
        }, 60 * 1000);
    }

    private static void createChannel(Context context, String channelId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.alert_sound);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();

            NotificationChannel channel = new NotificationChannel(channelId, "Persistent Alert", NotificationManager.IMPORTANCE_HIGH);
            channel.enableVibration(false);
            channel.setSound(soundUri, audioAttributes);

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    public static class NotificationClickReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            long timestamp = intent.getLongExtra("timestamp", -1);
            if (timestamp == -1) return;

            // Get reg_no stored from SharedPreferences (React Native side)
            SharedPreferences prefs = context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE);
            String regNo = prefs.getString("reg_no", null);
            Log.d("LocationService",regNo);
            

            if (regNo != null) {
                Log.d("LocationService","helllo");
                sendOpenedStatusToServer(timestamp, regNo);
            }

            MediaPlayer mp = mediaPlayers.remove(timestamp);
            if (mp != null) {
                mp.stop();
                mp.release();
            }

            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            manager.cancel((int) timestamp);
        }

        private void sendOpenedStatusToServer(long timestamp, String regNo) {
            new Thread(() -> {
                HttpURLConnection conn = null;
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("timestamp", timestamp);
                    obj.put("status", "opened");
                    obj.put("reg_no", regNo);

                    URL url = new URL("http://192.168.1.2:3000/alert/opened");
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
                    e.printStackTrace();
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }).start();
        }

    }


    public static void showPersistentInputNotification(Context context, String title, String message,
                                                   long timestamp, String replyKey) {

        String channelId = "persistent_input_channel_" + timestamp;
        createPersistentChannel(context, channelId);

        Intent replyIntent = new Intent(context, NotificationInputReceiver.class);
        replyIntent.putExtra("timestamp", timestamp);
        replyIntent.putExtra("replyKey", replyKey);

        PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            pendingIntent = PendingIntent.getBroadcast(context, (int) timestamp, replyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        } else {
            pendingIntent = PendingIntent.getBroadcast(context, (int) timestamp, replyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT);
        }

        // RemoteInput for inline reply
        RemoteInput remoteInput = new RemoteInput.Builder(replyKey)
                .setLabel("Enter your reply")
                .build();

        NotificationCompat.Action action = new NotificationCompat.Action.Builder(
                R.drawable.ic_notification, "Reply", pendingIntent)
                .addRemoteInput(remoteInput)
                .build();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setSmallIcon(R.drawable.ic_notification)
                .setAutoCancel(true)
                .addAction(action)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVibrate(new long[]{0, 500, 200, 500});

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        manager.notify((int) timestamp, builder.build());

        // ✅ Play looping alert sound
        try {
            MediaPlayer mediaPlayer = new MediaPlayer();
            Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.alert_sound);
            mediaPlayer.setDataSource(context, soundUri);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
            } else {
                mediaPlayer.setAudioStreamType(android.media.AudioManager.STREAM_ALARM);
            }

            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();

            mediaPlayers.put(timestamp, mediaPlayer);

            // 🔹 Auto-stop after 1 minute if no reply
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                MediaPlayer mp = mediaPlayers.remove(timestamp);
                if (mp != null && mp.isPlaying()) {
                    mp.stop();
                    mp.release();
                    Log.i("ALERT", "⏰ 1 minute passed — stopped sound automatically.");
                }
                manager.cancel((int) timestamp); // remove notification
            }, 60_000); // 1 minute = 60000 ms

        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    private static void createPersistentChannel(Context context, String channelId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.alert_sound);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();

            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Persistent Input Alert",
                    NotificationManager.IMPORTANCE_HIGH
            );

            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500}); // same as alert
            channel.setSound(soundUri, audioAttributes);

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }


    public static class NotificationInputReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {

            long timestamp = intent.getLongExtra("timestamp", -1);
            String replyKey = intent.getStringExtra("replyKey");

            SharedPreferences prefs = context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE);
            String regNo = prefs.getString("reg_no", null);

            if (timestamp != -1 && replyKey != null) {
                Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
                if (remoteInput != null) {
                    CharSequence reply = remoteInput.getCharSequence(replyKey);
                    
                    if (reply != null) {
                        String replyText = reply.toString();

                        // *** MODIFIED LOG LINE HERE ***
                        // Changed from Log.d to Log.i for higher visibility
                        Log.i(TAG, "User Reply Received: " + replyText);

                        // Stop and release sound
                        MediaPlayer mp = mediaPlayers.remove(timestamp);
                        if (mp != null) {
                            mp.stop();
                            mp.release();
                        }

                        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
                        manager.cancel((int) timestamp);

                        sendReplyToServer(context, replyText, timestamp, regNo);
                    } else {
                         Log.e(TAG, "Reply was null for key: " + replyKey);
                    }
                } else {
                     Log.e(TAG, "RemoteInput bundle was null.");
                }
            }
        }

        private void sendReplyToServer(Context context, String replyText, long timestamp, String regNo) {
            new Thread(() -> {
                HttpURLConnection conn = null;
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("reg_no", regNo);
                    obj.put("reply", replyText);
                    obj.put("timestamp", String.valueOf(timestamp));

                    URL url = new URL("http://192.168.1.2:3000/alert/reply");
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
                    Log.e(TAG, "Exception sending reply", e);
                }
            }).start();
        }
    }
}

