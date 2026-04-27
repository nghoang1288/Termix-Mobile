const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const packageName = "com.nghoang.sshbridge";
const packagePath = packageName.replace(/\./g, path.sep);

const serviceSource = `package ${packageName}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class SSHBridgeConnectionKeepAliveService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }

    val label = intent?.getStringExtra(EXTRA_LABEL)
    val notification = buildNotification(label)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }

    return START_STICKY
  }

  private fun buildNotification(label: String?): Notification {
    createNotificationChannel()

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
      ?: Intent(this, MainActivity::class.java)
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag(),
    )

    val text = label?.takeIf { it.isNotBlank() }
      ?: "Keeping SSH sessions and tunnels alive"

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_sshbridge)
      .setContentTitle("SSHBridge connections active")
      .setContentText(text)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager =
      getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "SSH connection keep alive",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Keeps active SSHBridge SSH sessions and tunnels running."
      setShowBadge(false)
    }

    manager.createNotificationChannel(channel)
  }

  private fun immutableFlag(): Int =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_IMMUTABLE
    } else {
      0
    }

  companion object {
    const val ACTION_START = "${packageName}.connection_keep_alive.START"
    const val ACTION_STOP = "${packageName}.connection_keep_alive.STOP"
    const val EXTRA_LABEL = "label"
    private const val CHANNEL_ID = "sshbridge_connection_keep_alive"
    private const val NOTIFICATION_ID = 4107
  }
}
`;

const moduleSource = `package ${packageName}

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SSHBridgeConnectionKeepAliveModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "SSHBridgeConnectionKeepAlive"

  @ReactMethod
  fun start(label: String?, promise: Promise) {
    try {
      val intent = Intent(
        reactContext,
        SSHBridgeConnectionKeepAliveService::class.java,
      ).apply {
        action = SSHBridgeConnectionKeepAliveService.ACTION_START
        putExtra(SSHBridgeConnectionKeepAliveService.EXTRA_LABEL, label)
      }

      ContextCompat.startForegroundService(reactContext, intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("KEEP_ALIVE_START_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      val intent = Intent(
        reactContext,
        SSHBridgeConnectionKeepAliveService::class.java,
      ).apply {
        action = SSHBridgeConnectionKeepAliveService.ACTION_STOP
      }

      reactContext.startService(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("KEEP_ALIVE_STOP_FAILED", error.message, error)
    }
  }
}
`;

const packageSource = `package ${packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SSHBridgeNativePackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext,
  ): List<NativeModule> =
    listOf(SSHBridgeConnectionKeepAliveModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
`;

const notificationIcon = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
  android:width="24dp"
  android:height="24dp"
  android:viewportWidth="24"
  android:viewportHeight="24">
  <path
    android:fillColor="#FFFFFFFF"
    android:pathData="M3,5h18v14H3zM5,7v10h14V7zM7,9.8l3.2,2.2L7,14.2V12l1.1,-0.8L7,10.4zM11,14h5v2h-5z" />
</vector>
`;

function addPermission(manifest, name) {
  manifest["uses-permission"] = manifest["uses-permission"] || [];
  const exists = manifest["uses-permission"].some(
    (permission) => permission.$?.["android:name"] === name,
  );

  if (!exists) {
    manifest["uses-permission"].push({ $: { "android:name": name } });
  }
}

function writeFileIfChanged(filePath, content) {
  if (
    fs.existsSync(filePath) &&
    fs.readFileSync(filePath, "utf8") === content
  ) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function patchMainApplication(filePath) {
  if (!fs.existsSync(filePath)) return;

  const marker = "add(SSHBridgeNativePackage())";
  let source = fs.readFileSync(filePath, "utf8");
  if (source.includes(marker)) return;

  const comment = "// add(MyReactNativePackage())";
  if (source.includes(comment)) {
    source = source.replace(comment, `${comment}\n              ${marker}`);
  } else {
    source = source.replace(
      "PackageList(this).packages.apply {",
      `PackageList(this).packages.apply {\n              ${marker}`,
    );
  }

  fs.writeFileSync(filePath, source);
}

const withConnectionKeepAlive = (config) => {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    addPermission(manifest, "android.permission.FOREGROUND_SERVICE");
    addPermission(manifest, "android.permission.FOREGROUND_SERVICE_DATA_SYNC");
    addPermission(manifest, "android.permission.POST_NOTIFICATIONS");

    const application = manifest.application?.[0];
    if (application) {
      application.service = application.service || [];
      const services = application.service;
      const service = services.find(
        (item) =>
          item.$?.["android:name"] === ".SSHBridgeConnectionKeepAliveService",
      );
      const attributes = {
        "android:name": ".SSHBridgeConnectionKeepAliveService",
        "android:exported": "false",
        "android:stopWithTask": "false",
        "android:foregroundServiceType": "dataSync",
      };

      if (service) {
        service.$ = { ...service.$, ...attributes };
      } else {
        services.push({ $: attributes });
      }
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const root = config.modRequest.projectRoot;
      const javaRoot = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "java",
        packagePath,
      );
      const drawableRoot = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "res",
        "drawable",
      );

      writeFileIfChanged(
        path.join(javaRoot, "SSHBridgeConnectionKeepAliveService.kt"),
        serviceSource,
      );
      writeFileIfChanged(
        path.join(javaRoot, "SSHBridgeConnectionKeepAliveModule.kt"),
        moduleSource,
      );
      writeFileIfChanged(
        path.join(javaRoot, "SSHBridgeNativePackage.kt"),
        packageSource,
      );
      writeFileIfChanged(
        path.join(drawableRoot, "ic_stat_sshbridge.xml"),
        notificationIcon,
      );
      patchMainApplication(path.join(javaRoot, "MainApplication.kt"));

      return config;
    },
  ]);

  return config;
};

module.exports = withConnectionKeepAlive;
