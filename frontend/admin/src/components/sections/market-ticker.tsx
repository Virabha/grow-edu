"use client";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
const PAIRS = [
    { symbol: "EUR/USD", price: "1.0845", change: "+0.05%", up: true },
    { symbol: "GBP/USD", price: "1.2630", change: "-0.12%", up: false },
    { symbol: "XAU/USD", price: "2035.50", change: "+1.20%", up: true },
    { symbol: "USD/JPY", price: "148.20", change: "+0.08%", up: true },
    { symbol: "BTC/USD", price: "42150.00", change: "-1.20%", up: false },
    { symbol: "ETH/USD", price: "2250.00", change: "-0.80%", up: false },
];
export function MarketTicker() {
    return (<div className="w-full bg-background/50 border-y border-border overflow-hidden py-4 backdrop-blur-md relative z-40">
        <div className="flex">
            <motion.div initial={{ x: 0 }} animate={{ x: "-50%" }} transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
        }} className="flex gap-16 whitespace-nowrap px-6">
                {[...PAIRS, ...PAIRS, ...PAIRS, ...PAIRS].map((pair, i) => (<div key={i} className="flex items-center gap-4">
                        <span className="font-bold text-foreground text-lg">{pair.symbol}</span>
                        <span className="text-muted-foreground font-mono">{pair.price}</span>
                        <span className={`flex items-center text-sm font-medium ${pair.up ? "text-emerald-400" : "text-rose-400"}`}>
                            {pair.up ? <ArrowUp className="w-4 h-4 mr-1"/> : <ArrowDown className="w-4 h-4 mr-1"/>}
                            {pair.change}
                        </span>
                    </div>))}
            </motion.div>
        </div>
    </div>);
}
