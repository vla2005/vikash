package com.vikash
import android.app.KeyguardManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

/** Separate task, same React host and authenticated services; never loads the dashboard. */
class VoiceEntryActivity : ReactActivity() {
  override fun getMainComponentName() = "VikashVoiceEntry"
  override fun onCreate(savedInstanceState: Bundle?) {
    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    super.onCreate(null)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      window.addFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND)
      window.attributes = window.attributes.apply { blurBehindRadius = 20 }
    }
  }
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    ReactActivityDelegateWrapper(this, true, DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled))
  override fun onResume() {
    super.onResume()
    if (getSystemService(KeyguardManager::class.java).isDeviceLocked) finish()
  }
  override fun onStop() {
    super.onStop()
    // Nothing remains listening or visible after leaving this compact activity.
    if (!isChangingConfigurations) finish()
  }
  override fun invokeDefaultOnBackPressed() { finish() }
}
