"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
interface StatCardProps {
    title: string;
    description?: string;
    value: string | number;
    icon?: LucideIcon;
    gradient?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}
export function StatCard({ title, description, value, icon: Icon, gradient, trend, className, }: StatCardProps) {
    return (<motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }} className={cn("h-full", className)}>
      <Card className="relative border-none shadow-lg h-full">
        {gradient && (<div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", gradient)}/>)}
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs sm:text-sm font-semibold">{title}</CardTitle>
            {Icon && (<div className={cn("p-1.5 rounded-md", gradient
                ? `bg-gradient-to-br ${gradient}`
                : "bg-primary/10 text-primary")}>
                <Icon className="h-3.5 w-3.5 text-white"/>
              </div>)}
          </div>
          {description && <CardDescription className="text-[11px]">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="relative pt-0">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
        }} className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent break-words">
            {value}
          </motion.div>
          {trend && (<div className={cn("text-xs mt-1", trend.isPositive ? "text-green-600" : "text-red-600")}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>)}
        </CardContent>
      </Card>
    </motion.div>);
}
