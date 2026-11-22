package app.wokamon.web;

import android.Manifest;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Lee el contador de pasos por hardware de Android (TYPE_STEP_COUNTER).
 * El sensor sigue contando aunque la app esté cerrada; devuelve el total desde el último reinicio
 * y la app calcula la diferencia desde la última lectura.
 */
@CapacitorPlugin(
    name = "StepCounter",
    permissions = { @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activity") }
)
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private SensorManager sensorManager;
    private Sensor stepSensor;
    private float lastValue = -1f;
    private boolean listening = false;
    private boolean wanted = false;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        }
    }

    private boolean hasPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return getPermissionState("activity") == PermissionState.GRANTED;
    }

    private JSObject snapshot() {
        JSObject ret = new JSObject();
        ret.put("available", stepSensor != null);
        ret.put("granted", hasPermission());
        ret.put("listening", listening);
        if (lastValue >= 0) ret.put("steps", (double) lastValue);
        return ret;
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(snapshot());
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (stepSensor == null) {
            call.reject("NOT_AVAILABLE");
            return;
        }
        if (!hasPermission()) {
            requestPermissionForAlias("activity", call, "activityPermissionCallback");
            return;
        }
        wanted = true;
        startListening();
        call.resolve(snapshot());
    }

    @PermissionCallback
    private void activityPermissionCallback(PluginCall call) {
        if (hasPermission()) {
            wanted = true;
            startListening();
            call.resolve(snapshot());
        } else {
            call.reject("PERMISSION_DENIED");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        wanted = false;
        stopListening();
        call.resolve();
    }

    private void startListening() {
        if (listening || sensorManager == null || stepSensor == null) return;
        listening = sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
    }

    private void stopListening() {
        if (sensorManager != null) sensorManager.unregisterListener(this);
        listening = false;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;
        lastValue = event.values[0];
        JSObject data = new JSObject();
        data.put("steps", (double) lastValue);
        notifyListeners("steps", data);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // No se usa.
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (wanted && hasPermission()) startListening();
    }

    @Override
    protected void handleOnDestroy() {
        stopListening();
        super.handleOnDestroy();
    }
}
