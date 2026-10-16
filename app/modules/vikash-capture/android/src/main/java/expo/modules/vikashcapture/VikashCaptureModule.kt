package expo.modules.vikashcapture

import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicLong
import android.os.HandlerThread
import android.view.PixelCopy
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicInteger

/** Copies only the rendered app window, never the separate assistant Modal. */
class VikashCaptureModule : Module() {
  private val worker = HandlerThread("VikashCapture").apply { start() }
  private val pending = AtomicInteger(0)
  @Volatile private var destroyed = false
  private val revision = AtomicLong(0)
  private var sourceRef: WeakReference<View>? = null
  private var sourceObserver: ViewTreeObserver? = null
  private var sourceBounds: Rect? = null
  private fun boundsOf(source: View): Rect {
    val location = IntArray(2)
    source.getLocationInWindow(location)
    return Rect(location[0], location[1], location[0] + source.width, location[1] + source.height)
  }
  // Modal/IME changes also dispatch global layout to the Activity. They do not
  // change the captured source, so do not invalidate for those notifications.
  private val layoutListener = ViewTreeObserver.OnGlobalLayoutListener {
    sourceRef?.get()?.let { source ->
      val bounds = boundsOf(source)
      if (bounds != sourceBounds) {
        sourceBounds = bounds
        revision.incrementAndGet()
      }
    }
  }
  private val scrollListener = ViewTreeObserver.OnScrollChangedListener { revision.incrementAndGet() }

  private fun unwatch() {
    sourceObserver?.takeIf {it.isAlive}?.apply {
      removeOnGlobalLayoutListener(layoutListener)
      removeOnScrollChangedListener(scrollListener)
    }
    sourceObserver = null; sourceRef = null; sourceBounds = null
  }
  private fun watch(source: View) {
    if(sourceRef?.get() === source && sourceObserver?.isAlive == true) return
    unwatch(); sourceRef = WeakReference(source); sourceObserver = source.viewTreeObserver
    sourceBounds = boundsOf(source)
    sourceObserver?.addOnGlobalLayoutListener(layoutListener)
    sourceObserver?.addOnScrollChangedListener(scrollListener)
    revision.incrementAndGet()
  }

  override fun definition() = ModuleDefinition {
    Name("VikashCapture")
    Function("getRevision") { revision.get().toDouble() }
    AsyncFunction("observe") { tag: Int ->
      val source = appContext.findView<View>(tag)
      if(source != null && !destroyed) watch(source)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("capture") { tag: Int, width: Int, height: Int, promise: Promise ->
      if (destroyed || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.reject("ERR_CAPTURE_UNAVAILABLE", "Window capture unavailable", null)
        return@AsyncFunction
      }
      var bitmap: Bitmap? = null
      try {
        require(width in 1..720 && height in 1..4096 && width.toLong()*height <= 3_000_000)
        val activity = appContext.currentActivity ?: error("Activity unavailable")
        val source = appContext.findView<View>(tag)
          ?: error("Capture target unavailable")
        check(source.isAttachedToWindow && source.width > 0 && source.height > 0)
        watch(source)
        val capturedRevision = revision.get()
        // Window pixels are pre-rendered: no recursive view.draw(), no UI-thread wait.
        val location = IntArray(2)
        source.getLocationInWindow(location)
        val bounds = Rect(location[0], location[1], location[0]+source.width, location[1]+source.height)
        val image = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap = image
        pending.incrementAndGet()
        PixelCopy.request(activity.window, bounds, image, { status ->
          try {
            if (status != PixelCopy.SUCCESS || destroyed) {
              promise.reject("ERR_CAPTURE_COPY", "Window capture did not complete", null)
            } else {
              // Expo converts ByteArray to Uint8Array through JSI. No PNG, base64,
              // disk files, network, or screenshot data in diagnostic logs.
              val pixels = ByteArray(image.byteCount)
              image.copyPixelsToBuffer(ByteBuffer.wrap(pixels))
              promise.resolve(mapOf("width" to width, "height" to height,
                "bytesPerRow" to image.rowBytes, "revision" to capturedRevision.toDouble(), "pixels" to pixels))
            }
          } catch (error: Exception) {
            promise.reject("ERR_CAPTURE_PIXELS", "Cannot read capture pixels", error)
          } finally {
            image.recycle()
            if (pending.decrementAndGet() == 0 && destroyed) worker.quitSafely()
          }
        }, Handler(worker.looper))
        bitmap = null // Callback owns the bitmap until PixelCopy finishes.
      } catch (error: Exception) {
        if (bitmap != null) {bitmap.recycle(); pending.decrementAndGet()}
        promise.reject("ERR_CAPTURE_WINDOW", "Cannot capture app window", error)
      }
    }.runOnQueue(Queues.MAIN)
    OnDestroy {
      destroyed = true
      Handler(Looper.getMainLooper()).post { unwatch() }
      if (pending.get() == 0) worker.quitSafely()
    }
  }
}
