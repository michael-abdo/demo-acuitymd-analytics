"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CircleDollarSign, Clock, Gauge, Calendar, BarChart2, AlertCircle } from "lucide-react"

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string | number
  change?: string
  loading: boolean
}

const StatItem = ({ icon, label, value, change, loading }: StatItemProps) => (
  <div className="flex items-start space-x-4">
    <div className="p-2 bg-muted rounded-full">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <div className="h-6 w-24 bg-muted animate-pulse rounded mt-1"></div>
      ) : (
        <div className="flex items-baseline">
          <h3 className="text-2xl font-bold">{value}</h3>
          {change && <p className="ml-2 text-xs text-green-500">{change}</p>}
        </div>
      )}
    </div>
  </div>
)

interface TruckSummaryStatsProps {
  trucks?: any[] // Array of truck objects from the API
  stats?: any // Statistics from the /api/trucks/stats endpoint
  refreshTrigger?: number // Optional prop to trigger refresh
}

export default function TruckSummaryStats({ trucks = [], stats = null }: TruckSummaryStatsProps) {
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    // Check if we have valid statistics data
    setHasData(!!stats && stats.count > 0)
    setLoading(false)
  }, [stats, trucks])

  // Format the price with a dollar sign and commas
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString()}`
  }
  
  // Format the mileage with commas
  const formatMileage = (miles: number) => {
    return `${miles.toLocaleString()} mi`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          // Show loading state for statistics
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatItem
              icon={<CircleDollarSign className="h-5 w-5 text-primary" />}
              label="Average Price"
              value="$0"
              loading={loading}
            />
            <StatItem
              icon={<Calendar className="h-5 w-5 text-primary" />}
              label="Average Year"
              value="0"
              loading={loading}
            />
            <StatItem
              icon={<Gauge className="h-5 w-5 text-primary" />}
              label="Average Mileage"
              value="0 mi"
              loading={loading}
            />
            <StatItem
              icon={<BarChart2 className="h-5 w-5 text-primary" />}
              label="Price Range"
              value="$0 - $0"
              loading={loading}
            />
          </div>
        ) : !hasData ? (
          // Show no data available message
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No Data Available</h3>
            <p className="text-sm text-muted-foreground">
              No trucks found matching your criteria to calculate statistics
            </p>
          </div>
        ) : (
          // Show statistics when data is available
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatItem
                icon={<CircleDollarSign className="h-5 w-5 text-primary" />}
                label="Average Price"
                value={formatPrice(Math.round(Number(stats.price.avg) || 0))}
                loading={loading}
              />
              <StatItem
                icon={<Calendar className="h-5 w-5 text-primary" />}
                label="Average Year"
                value={Math.round(Number(stats.year.avg) || 0)}
                loading={loading}
              />
              <StatItem
                icon={<Gauge className="h-5 w-5 text-primary" />}
                label="Average Mileage"
                value={formatMileage(Math.round(Number(stats.mileage.avg) || 0))}
                loading={loading}
              />
              <StatItem
                icon={<BarChart2 className="h-5 w-5 text-primary" />}
                label="Price Range"
                value={`${formatPrice(stats.price.min || 0)} - ${formatPrice(stats.price.max || 0)}`}
                loading={loading}
              />
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-4">Top Manufacturers</h4>
                <ul className="space-y-1">
                  {stats.topManufacturers && stats.topManufacturers.map((item: any, index: number) => (
                    <li key={index} className="text-xs flex justify-between">
                      <span className="font-bold">{item.manufacturer}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden md:block w-px bg-border mx-36" />
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-4">Top Models</h4>
                <ul className="space-y-1">
                  {stats.topModels && stats.topModels.map((item: any, index: number) => (
                    <li key={index} className="text-xs flex justify-between">
                      <span className="font-bold">{item.model}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
              Based on {stats.count} trucks matching your criteria
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
} 