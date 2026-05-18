"use client";
import { useRouter } from "next/navigation";
import { XCircle, AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
export default function PaymentFailurePage() {
    const router = useRouter();
    return (<div className="flex items-center justify-center min-h-[80vh] p-4 font-poppins relative overflow-hidden">
        
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] animate-pulse"/>
      </div>

      <Card className="w-full max-w-lg border-none shadow-none bg-transparent relative z-10">
        <CardContent className="flex flex-col items-center justify-center text-center p-0">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="flex flex-col items-center w-full">
            <div className="relative mb-8 group cursor-pointer">
              <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }} className="rounded-full bg-red-500/10 p-8 shadow-2xl shadow-red-500/20">
                <AlertTriangle className="w-20 h-20 text-red-500" strokeWidth={1.5}/>
              </motion.div>
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} transition={{ duration: 0.5, delay: 0.2 }} className="absolute inset-0 bg-red-500/20 rounded-full blur-xl -z-10"/>
            </div>
            
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-4xl font-bold mb-3 text-foreground">
                Payment <span className="text-red-500">Cancelled</span>
            </motion.h1>
            
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-muted-foreground text-lg mb-10 max-w-md leading-relaxed">
              The transaction was declined or cancelled. Don't worry, you haven't been charged.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
              <Button onClick={() => router.push("/cart")} size="lg" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20">
                <RefreshCw className="mr-2 w-4 h-4"/>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")} size="lg" className="w-full h-12 text-base hover:bg-muted/50 border-muted-foreground/20">
                <ArrowLeft className="mr-2 w-4 h-4"/>
                Dashboard
              </Button>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-12 text-sm text-muted-foreground">
              Need help? <span className="text-primary font-medium cursor-pointer hover:underline transition-all" onClick={() => router.push("/contact")}>Contact Support</span>
            </motion.p>
          </motion.div>
        </CardContent>
      </Card>
    </div>);
}
