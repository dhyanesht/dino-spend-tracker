
import React from "react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from "recharts"

interface EnhancedPieChartProps {
  data: any[]
  dataKey: string
  nameKey: string
  colors: string[]
  title?: string
}

export function EnhancedPieChart({ data, dataKey, nameKey, colors, title }: EnhancedPieChartProps) {
  const chartConfig = data.reduce((acc, item, index) => {
    acc[item[nameKey]] = {
      label: item[nameKey],
      color: colors[index % colors.length],
    }
    return acc
  }, {})

  return (
    <ChartContainer config={chartConfig} className="h-80">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={100}
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={colors[index % colors.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

interface EnhancedBarChartProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  title?: string
  color?: string
}

export function EnhancedBarChart({ data, dataKey, xAxisKey, title, color = "hsl(var(--primary))" }: EnhancedBarChartProps) {
  const chartConfig = {
    [dataKey]: {
      label: title || dataKey,
      color: color,
    },
  }

  return (
    <ChartContainer config={chartConfig} className="h-80">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey={xAxisKey}
          angle={-45}
          textAnchor="end"
          height={60}
          fontSize={12}
          className="fill-muted-foreground"
        />
        <YAxis className="fill-muted-foreground" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar 
          dataKey={dataKey} 
          fill={color}
          radius={[4, 4, 0, 0]}
          className="hover:opacity-80 transition-opacity"
        />
      </BarChart>
    </ChartContainer>
  )
}

interface EnhancedLineChartProps {
  data: any[]
  lines: Array<{ dataKey: string; color: string; name: string }>
  xAxisKey: string
}

export function EnhancedLineChart({ data, lines, xAxisKey }: EnhancedLineChartProps) {
  const chartConfig = lines.reduce((acc, line) => {
    acc[line.dataKey] = {
      label: line.name,
      color: line.color,
    }
    return acc
  }, {})

  return (
    <ChartContainer config={chartConfig} className="h-80">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey={xAxisKey}
          className="fill-muted-foreground"
        />
        <YAxis className="fill-muted-foreground" />
        <ChartTooltip content={<ChartTooltipContent />} />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            strokeWidth={2}
            name={line.name}
            dot={{ r: 4 }}
            className="hover:stroke-[3px] transition-all"
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

interface EnhancedAreaChartProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  color?: string
  title?: string
}

export function EnhancedAreaChart({ data, dataKey, xAxisKey, color = "hsl(var(--primary))", title }: EnhancedAreaChartProps) {
  const chartConfig = {
    [dataKey]: {
      label: title || dataKey,
      color: color,
    },
  }

  return (
    <ChartContainer config={chartConfig} className="h-80">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey={xAxisKey}
          className="fill-muted-foreground"
        />
        <YAxis className="fill-muted-foreground" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={color}
          fillOpacity={0.2}
          strokeWidth={2}
          className="hover:fill-opacity-30 transition-all"
        />
      </AreaChart>
    </ChartContainer>
  )
}
