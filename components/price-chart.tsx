"use client"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

// Function to generate random price data
const generatePriceData = () => {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]

  return months.map((month, index) => {
    // Create a slight upward trend with some variation
    const basePrice = 32000 + index * 400 + (Math.random() * 1500 - 750)
    const highTrim = basePrice + 8000 + Math.random() * 1200
    const lowTrim = basePrice - 6000 - Math.random() * 1000

    return {
      month,
      highTrim: Math.round(highTrim),
      averagePrice: Math.round(basePrice),
      lowTrim: Math.round(lowTrim),
    }
  })
}

export default function PriceChart() {
  // Generate new data on each render
  const priceData = generatePriceData()

  const formatYAxis = (value) => {
    return `$${(value / 1000).toFixed(0)}k`
  }

  const formatTooltipValue = (value) => {
    return `$${value.toLocaleString()}`
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={priceData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => [`$${value.toLocaleString()}`, ""]}
            labelFormatter={(label) => `${label} 2023`}
          />
          <Legend verticalAlign="top" height={36} />
          <Line
            name="High Trim"
            type="monotone"
            dataKey="highTrim"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="Average Price"
            type="monotone"
            dataKey="averagePrice"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="Low Trim"
            type="monotone"
            dataKey="lowTrim"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

