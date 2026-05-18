"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
export function LandingPageSkeleton() {
    return (<main className="min-h-screen bg-background">
      
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48"/>
            <div className="flex gap-4">
              <Skeleton className="h-9 w-24"/>
              <Skeleton className="h-9 w-24"/>
              <Skeleton className="h-9 w-24"/>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-full"/>
              <Skeleton className="h-9 w-9 rounded-full"/>
            </div>
          </div>
        </div>
      </div>

      
      <section className="py-14 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Skeleton className="h-12 w-full max-w-2xl mx-auto"/>
            <Skeleton className="h-6 w-full max-w-xl mx-auto"/>
            <Skeleton className="h-6 w-3/4 max-w-lg mx-auto"/>
            <div className="flex gap-4 justify-center pt-4">
              <Skeleton className="h-12 w-32"/>
              <Skeleton className="h-12 w-32"/>
            </div>
          </div>
        </div>
      </section>

      
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (<div key={i} className="text-center space-y-2">
                <Skeleton className="h-8 w-20 mx-auto"/>
                <Skeleton className="h-4 w-32 mx-auto"/>
              </div>))}
          </div>
        </div>
      </section>

      
      <section className="py-10 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 space-y-3">
            <Skeleton className="h-10 w-64 mx-auto"/>
            <Skeleton className="h-5 w-96 mx-auto"/>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (<Card key={i} className="overflow-hidden border-none">
                <Skeleton className="aspect-video w-full"/>
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-full"/>
                  <Skeleton className="h-6 w-4/5"/>
                  <Skeleton className="h-4 w-full"/>
                  <Skeleton className="h-4 w-3/4"/>
                  <div className="flex items-center justify-between pt-4">
                    <Skeleton className="h-6 w-24"/>
                    <Skeleton className="h-9 w-28"/>
                  </div>
                </div>
              </Card>))}
          </div>
          <div className="text-center mt-8">
            <Skeleton className="h-10 w-40 mx-auto"/>
          </div>
        </div>
      </section>

      
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 space-y-3">
            <Skeleton className="h-10 w-64 mx-auto"/>
            <Skeleton className="h-5 w-80 mx-auto"/>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (<Card key={i} className="border-none">
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4"/>
                  <Skeleton className="h-4 w-full"/>
                  <Skeleton className="h-4 w-5/6"/>
                </div>
              </Card>))}
          </div>
        </div>
      </section>

      
      <section className="py-10 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-3">
              <Skeleton className="h-10 w-80 mx-auto"/>
              <Skeleton className="h-5 w-96 mx-auto"/>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (<Card key={i} className="border-none">
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4"/>
                    <Skeleton className="h-4 w-full"/>
                    <Skeleton className="h-4 w-5/6"/>
                  </div>
                </Card>))}
            </div>
          </div>
        </div>
      </section>

      
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (<div key={i} className="space-y-3">
                <Skeleton className="h-6 w-24"/>
                <Skeleton className="h-4 w-32"/>
                <Skeleton className="h-4 w-28"/>
                <Skeleton className="h-4 w-36"/>
              </div>))}
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center">
            <Skeleton className="h-4 w-64 mx-auto"/>
          </div>
        </div>
      </footer>
    </main>);
}
