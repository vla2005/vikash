package expo.modules.vikashvoiceentry
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class VoiceEntryTileService : TileService() {
  override fun onStartListening() {
    qsTile?.apply { label = "Registrar Gasto"; state = Tile.STATE_INACTIVE; updateTile() }
  }
  override fun onClick() {
    super.onClick()
    // The system handles authentication; never expose finances on the lock screen.
    if (isLocked) unlockAndRun { openEntry() } else openEntry()
  }
  @Suppress("DEPRECATION")
  private fun openEntry() {
    val intent = Intent().setClassName(this, "$packageName.VoiceEntryActivity")
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    if (Build.VERSION.SDK_INT >= 34) {
      startActivityAndCollapse(PendingIntent.getActivity(this, 0, intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    } else startActivityAndCollapse(intent)
  }
}
