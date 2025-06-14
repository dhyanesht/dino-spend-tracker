
import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, PieChart, TrendingUp, FileText } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground max-w-md">{description}</p>
        </div>
        {action && (
          <Button onClick={action.onClick} className="mt-4">
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  )
}

export function NoTransactionsEmpty({ onImport }: { onImport: () => void }) {
  return (
    <EmptyState
      icon={<Upload className="h-8 w-8" />}
      title="No transactions yet"
      description="Start by importing your financial data from CSV files. Our smart system will automatically categorize your expenses."
      action={{
        label: "Import Transactions",
        onClick: onImport
      }}
    />
  )
}

export function NoTrendsEmpty() {
  return (
    <EmptyState
      icon={<TrendingUp className="h-8 w-8" />}
      title="Not enough data for trends"
      description="Import more transactions to see spending trends and analytics. You need at least a few transactions to generate meaningful insights."
    />
  )
}

export function NoCategoriesEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<PieChart className="h-8 w-8" />}
      title="No categories created"
      description="Create expense categories to organize your spending. Start with common categories like Food, Transportation, and Entertainment."
      action={{
        label: "Create Category",
        onClick: onCreate
      }}
    />
  )
}

export function NoDataEmpty() {
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8" />}
      title="No data available"
      description="There's no data to display for the selected time period. Try selecting a different date range or import more transactions."
    />
  )
}
