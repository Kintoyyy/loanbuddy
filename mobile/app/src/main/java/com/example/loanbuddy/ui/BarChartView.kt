package com.example.loanbuddy.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View

class BarChartView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    data class MonthData(val label: String, val lent: Float, val collected: Float)

    private var months: List<MonthData> = emptyList()

    private val lentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFD4D4D8.toInt()
    }
    private val collectedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF10B981.toInt()
    }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF71717A.toInt()
        textAlign = Paint.Align.CENTER
    }

    fun setData(data: List<MonthData>) {
        months = data
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        val density = resources.displayMetrics.density
        labelPaint.textSize = 10f * resources.displayMetrics.scaledDensity

        val labelH = 36f
        val topPad = 8f
        val chartH = height - labelH - topPad
        val count = if (months.isEmpty()) 6 else months.size

        if (months.isEmpty()) {
            drawEmpty(canvas, count, chartH, topPad, labelH, density)
            return
        }

        val maxVal = months.maxOf { maxOf(it.lent, it.collected) }.coerceAtLeast(1f)
        val colW = width.toFloat() / count
        val barW = colW * 0.22f

        months.forEachIndexed { i, item ->
            val cx = (i + 0.5f) * colW
            val lentH = (item.lent / maxVal) * chartH
            val collH = (item.collected / maxVal) * chartH
            val minH = 4f

            canvas.drawRoundRect(
                RectF(cx - barW - 3, topPad + chartH - lentH.coerceAtLeast(minH), cx - 3, topPad + chartH),
                6f, 6f, lentPaint
            )
            canvas.drawRoundRect(
                RectF(cx + 3, topPad + chartH - collH.coerceAtLeast(minH), cx + barW + 3, topPad + chartH),
                6f, 6f, collectedPaint
            )
            canvas.drawText(item.label, cx, topPad + chartH + labelH - 6f, labelPaint)
        }
    }

    private fun drawEmpty(canvas: Canvas, count: Int, chartH: Float, topPad: Float, labelH: Float, density: Float) {
        val labels = listOf("Dec", "Jan", "Feb", "Mar", "Apr", "May")
        val colW = width.toFloat() / count
        val barW = colW * 0.22f
        val minH = 8f

        lentPaint.alpha = 100
        collectedPaint.alpha = 100

        repeat(count) { i ->
            val cx = (i + 0.5f) * colW
            canvas.drawRoundRect(RectF(cx - barW - 3, topPad + chartH - minH, cx - 3, topPad + chartH), 4f, 4f, lentPaint)
            canvas.drawRoundRect(RectF(cx + 3, topPad + chartH - minH, cx + barW + 3, topPad + chartH), 4f, 4f, collectedPaint)
            canvas.drawText(labels.getOrElse(i) { "" }, cx, topPad + chartH + labelH - 6f, labelPaint)
        }

        lentPaint.alpha = 255
        collectedPaint.alpha = 255
    }
}
