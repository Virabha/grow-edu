"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}
interface SimpleBarChartProps {
    title?: string;
    data: ChartDataPoint[];
    maxValue?: number;
    height?: number;
    noCard?: boolean;
}
export function SimpleBarChart({ title, data, maxValue, height: _height = 200, noCard = false }: SimpleBarChartProps) {
    const max = maxValue || Math.max(...data.map((d) => d.value), 1);
    const chartContent = (<div className="space-y-3 sm:space-y-2 md:space-y-3 w-full min-h-full">
      {data.map((item, index) => {
            const percentage = max > 0 ? (item.value / max) * 100 : 0;
            return (<div key={item.label} className="space-y-2 sm:space-y-1 w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start sm:items-center gap-1.5 sm:gap-2 w-full">
              <span className="text-muted-foreground text-xs sm:text-sm break-words sm:truncate pr-0 sm:pr-2 flex-1 w-full leading-relaxed" title={item.label}>
                {item.label}
              </span>
              <span className="font-medium flex-shrink-0 text-xs sm:text-sm sm:ml-2 whitespace-nowrap mt-0.5 sm:mt-0">{item.value}</span>
            </div>
            <div className="h-2 bg-muted rounded-full w-full">
              <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }} className={`h-full rounded-full ${item.color || "bg-primary"}`}/>
            </div>
          </div>);
        })}
    </div>);
    if (noCard) {
        return chartContent;
    }
    return (<Card>
      {title && (<CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>)}
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>);
}
interface SimpleLineChartProps {
    title?: string;
    data: ChartDataPoint[];
    height?: number;
    noCard?: boolean;
}
export function SimpleLineChart({ title, data, height = 200, noCard = false }: SimpleLineChartProps) {
    const max = Math.max(...data.map((d) => d.value), 1);
    const points = data.map((item, index) => {
        const x = (index / (data.length - 1 || 1)) * 100;
        const y = 100 - (item.value / max) * 100;
        return `${x},${y}`;
    }).join(" ");
    const chartHeight = height - 24;
    const chartContent = (<div style={{ height: `${height}px` }} className="relative flex flex-col w-full max-w-full">
      <div style={{ height: `${chartHeight}px` }} className="relative flex-1 min-h-0 w-full max-w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full max-w-full">
          <motion.polyline initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: "easeInOut" }} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" points={points}/>
          {data.map((item, index) => {
            const x = (index / (data.length - 1 || 1)) * 100;
            const y = 100 - (item.value / max) * 100;
            return (<motion.circle key={item.label} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 + index * 0.1 }} cx={x} cy={y} r="2" fill="currentColor" className="text-primary"/>);
        })}
        </svg>
      </div>
                 <div className="h-6 flex justify-between items-start text-[10px] sm:text-xs text-muted-foreground pt-1 px-0.5 sm:px-1 gap-0.5 sm:gap-1 overflow-hidden">
                   {data.map((item, index) => (<span key={index} className="truncate max-w-[45px] sm:max-w-[60px] flex-shrink-0" title={item.label}>
                       {item.label}
                     </span>))}
                 </div>
    </div>);
    if (noCard) {
        return chartContent;
    }
    return (<Card>
      {title && (<CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>)}
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>);
}
