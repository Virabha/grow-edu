"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
interface SuccessCheckProps {
    size?: number;
    color?: string;
}
export function SuccessCheck({ size = 80, color = "#22c55e" }: SuccessCheckProps) {
    return (<div className="relative flex items-center justify-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2,
        }} className="relative" style={{ width: size, height: size }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.3,
        }} className="absolute inset-0 rounded-full" style={{
            backgroundColor: color,
            opacity: 0.2,
        }}/>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.4,
        }} className="absolute inset-0 rounded-full border-4" style={{
            borderColor: color,
        }}/>
        <motion.svg initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{
            pathLength: { duration: 0.5, delay: 0.6, ease: "easeInOut" },
            opacity: { duration: 0.3, delay: 0.6 },
        }} className="absolute inset-0" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{
            pathLength: { duration: 0.5, delay: 0.6, ease: "easeInOut" },
        }}/>
        </motion.svg>
      </motion.div>
    </div>);
}
