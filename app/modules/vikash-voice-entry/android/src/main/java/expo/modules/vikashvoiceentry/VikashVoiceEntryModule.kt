package expo.modules.vikashvoiceentry
import android.app.StatusBarManager
import android.content.ComponentName
import android.graphics.drawable.Icon
import android.os.Build
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VikashVoiceEntryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VikashVoiceEntry")
    AsyncFunction("newRequestId") { java.util.UUID.randomUUID().toString() }
    AsyncFunction("finish") {
      appContext.currentActivity?.takeIf { it.componentName.className.endsWith(".VoiceEntryActivity") }?.finish()
      true
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("openApp") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      activity.packageManager.getLaunchIntentForPackage(activity.packageName)?.let { activity.startActivity(it) }
      if (activity.componentName.className.endsWith(".VoiceEntryActivity")) activity.finish()
      true
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("addTile") { promise: expo.modules.kotlin.Promise ->
      val activity = appContext.currentActivity
      if (Build.VERSION.SDK_INT < 33 || activity == null) {
        promise.resolve("manual"); return@AsyncFunction
      }
      try {
        activity.getSystemService(StatusBarManager::class.java).requestAddTileService(
          ComponentName(activity, VoiceEntryTileService::class.java), "Registrar Gasto",
          Icon.createWithResource(activity, R.drawable.ic_voice_entry), activity.mainExecutor
        ) { result -> promise.resolve(when (result) {
          StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED -> "added"
          StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED -> "added"
          else -> "manual"
        }) }
      } catch (_: Exception) { promise.resolve("manual") }
    }.runOnQueue(Queues.MAIN)
  }
}
