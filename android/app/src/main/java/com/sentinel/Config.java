package com.sentinel;

public class Config {
    public static final String API_BASE_URL = "https://sentinel-shield-kocg.onrender.com/api";
    public static final String ENTRY_API = API_BASE_URL + "/location/log";
    public static final String EXIT_API = API_BASE_URL + "/location/exit-verification";
    public static final String EXIT_OFFLINE_API = API_BASE_URL + "/location/exit-offline";
    public static final String CHECK_ENTRY_API = API_BASE_URL + "/location/checkattendance";
    public static final String ALERT_OPEND_API = API_BASE_URL + "/location/alert/opened";
    public static final String ALERT_REPLY_API = API_BASE_URL + "/location/alert/reply";
    public static final String ALERT_DEVICE_RESPONSE_API = API_BASE_URL + "/location/device/response";

    


    public static final float ACCURACY_THRESHOLD = 50f;
    public static final float MIN_DISTANCE_METERS = 10f;
    public static final float MAX_JUMP_DISTANCE = 500f;

    // Triangle points for geofence
    public static final GeoPoint A = new GeoPoint(8.688042, 77.725464);
    public static final GeoPoint B = new GeoPoint(8.685985, 77.727540);
    public static final GeoPoint C = new GeoPoint(8.686051, 77.725166);
}

class GeoPoint {
    public double latitude, longitude;
    public GeoPoint(double lat, double lon) { this.latitude = lat; this.longitude = lon; }
}

