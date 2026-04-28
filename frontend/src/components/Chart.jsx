import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

export default function Chart({ type = 'line', data, options }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new ChartJS(canvasRef.current, { type, data, options })
    return () => {
      if (chartRef.current) chartRef.current.destroy()
      chartRef.current = null
    }
  }, [type, data, options])

  return <canvas ref={canvasRef} />
}

