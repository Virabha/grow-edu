"use client";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "./animated-number";
interface AnimatedMetricCardProps {
    title: string;
    description: string;
    value: number;
    icon: React.ComponentType<{
        className?: string;
    }>;
    gradient: string;
    index: number;
    suffix?: string;
    decimals?: number;
}
export function AnimatedMetricCard({ title, description, value, icon: Icon, gradient, index, suffix = "", decimals = 0, }: AnimatedMetricCardProps) {
    return (<motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{
            duration: 0.6,
            delay: index * 0.1,
            type: "spring",
            stiffness: 100,
            damping: 15,
        }} whileHover={{
            scale: 1.05,
            y: -8,
            transition: { duration: 0.2 },
        }} className="h-full">
      <Card className="relative border-2 border-border/50 shadow-xl h-full group hover:shadow-2xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
        <motion.div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
        }} transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
        }} style={{
            backgroundSize: "200% 200%",
        }}/>
        
        <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut",
        }}/>

        <CardHeader className="relative z-10 pb-2 sm:pb-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex-1 min-w-0">{title}</CardTitle>
            <motion.div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg flex-shrink-0`} whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }} transition={{ duration: 0.5 }}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white"/>
            </motion.div>
          </div>
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pt-0">
          <div className="flex items-baseline gap-2">
            <AnimatedNumber value={value} suffix={suffix} decimals={decimals}/>
          </div>
          
          {(suffix === "%" || title.includes("Rate") || title.includes("Progress")) && (<motion.div className="mt-3 sm:mt-4 h-2 bg-muted rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + index * 0.1 }}>
              <motion.div className={`h-full bg-gradient-to-r ${gradient} rounded-full`} initial={{ width: 0 }} animate={{ width: `${Math.min(value, 100)}%` }} transition={{
                duration: 1.5,
                delay: 0.7 + index * 0.1,
                type: "spring",
                stiffness: 50,
            }}/>
            </motion.div>)}
        </CardContent>
      </Card>
    </motion.div>);
}
