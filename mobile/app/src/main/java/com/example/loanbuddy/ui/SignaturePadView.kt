package com.example.loanbuddy.ui

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View

class SignaturePadView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private val path = Path()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#18181B")
        strokeWidth = 5f
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val bgPaint = Paint().apply {
        color = Color.WHITE
        style = Paint.Style.FILL
    }
    private var lastX = 0f
    private var lastY = 0f
    private var hasStrokes = false

    var onChanged: ((Boolean) -> Unit)? = null

    override fun onDraw(canvas: Canvas) {
        canvas.drawPaint(bgPaint)
        canvas.drawPath(path, paint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val x = event.x
        val y = event.y
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                path.moveTo(x, y)
                lastX = x; lastY = y
                if (!hasStrokes) {
                    hasStrokes = true
                    onChanged?.invoke(true)
                }
            }
            MotionEvent.ACTION_MOVE -> {
                val cx = (lastX + x) / 2f
                val cy = (lastY + y) / 2f
                path.quadTo(lastX, lastY, cx, cy)
                lastX = x; lastY = y
            }
            MotionEvent.ACTION_UP -> path.lineTo(x, y)
        }
        invalidate()
        return true
    }

    fun clear() {
        path.reset()
        hasStrokes = false
        onChanged?.invoke(false)
        invalidate()
    }

    fun isEmpty() = !hasStrokes

    fun toByteArray(): ByteArray {
        val bmp = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        draw(canvas)
        val out = java.io.ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        bmp.recycle()
        return out.toByteArray()
    }
}
