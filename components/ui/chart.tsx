import { ReactNode } from "react"
import { ResponsiveContainer } from "recharts"

export type ChartConfig = Record<
  string,
  {
    label: string
    color?: string
  }
>

interface ChartContainerProps {
  children: ReactNode
  config: ChartConfig
  className?: string
}

export function ChartContainer({
  children,
  config,
  className,
}: ChartContainerProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      {children}
    </ResponsiveContainer>
  )
}

interface ChartTooltipProps {
  children: ReactNode
  content?: ReactNode
}

export function ChartTooltip({ children, content }: ChartTooltipProps) {
  return <>{children}</>
}

interface ChartTooltipContentProps {
  nameKey: string
  hideLabel?: boolean
}

export function ChartTooltipContent({
  nameKey,
  hideLabel,
}: ChartTooltipContentProps) {
  return null
} 