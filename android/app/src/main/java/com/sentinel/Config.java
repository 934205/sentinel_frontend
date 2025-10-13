package com.sentinel;

public class Config {
    public static final String API_BASE_URL = "https://sentinel-shield-kocg.onrender.com/api";
    public static final String ENTRY_API = API_BASE_URL + "/location/log";
    public static final String EXIT_API = API_BASE_URL + "/location/exit-verification";
    public static final String CHECK_ENTRY_API = API_BASE_URL + "/location/checkattendance/";

    public static final float ACCURACY_THRESHOLD = 50f;
    public static final float MIN_DISTANCE_METERS = 2f;
    public static final float MAX_JUMP_DISTANCE = 500f;

    // Triangle points for geofence
    public static final GeoPoint A = new GeoPoint(12.345678, 77.123456);
    public static final GeoPoint B = new GeoPoint(12.346000, 77.124000);
    public static final GeoPoint C = new GeoPoint(12.344500, 77.125000);
}

class GeoPoint {
    public double latitude, longitude;
    public GeoPoint(double lat, double lon) { this.latitude = lat; this.longitude = lon; }
}

