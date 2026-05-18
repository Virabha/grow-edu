"use client";

import { useMemo, useState, useCallback } from "react";
import { useServices } from "@/lib/hooks/use-cms";
import { getLucideIcon } from "@/lib/lucide-icons";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceApplicationDialog } from "@/components/forms/service-application-dialog";
import type { Service } from "@/lib/api/services/cms";

const VIOLET_HEADER_CLASS =
  "bg-gradient-to-r from-[#8A2C91] via-[#7C218B] to-[#5E1676]";
const BLUE_HEADER_CLASS = "bg-[#000052]";
const getHeaderBgClass = (index: number) =>
  index % 2 === 1 ? VIOLET_HEADER_CLASS : BLUE_HEADER_CLASS;

function ServiceImageCarousel({ service }: { service: Service }) {
  const EmptyIcon = useMemo(
    () => (service.iconName ? getLucideIcon(service.iconName) : null),
    [service.iconName],
  );

  const images = service.screenshots?.length
    ? service.screenshots
    : service.imageUrl
      ? [service.imageUrl]
      : [];
  const [currentIdx, setCurrentIdx] = useState(0);

  const handlePrev = useCallback(() => {
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIdx((prev) => (prev + 1) % images.length);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-violet-500/10">
        {EmptyIcon ? (
          <EmptyIcon className="size-16 text-primary/40" />
        ) : (
          <span className="text-5xl font-bold text-primary/20">{service.title[0]}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-none bg-muted group">
      <div className="relative aspect-video w-full">
        <Image
          src={images[currentIdx]}
          alt={`${service.title} - screenshot ${currentIdx + 1}`}
          fill
          className="object-cover transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized={images[currentIdx].startsWith("http")}
        />
      </div>
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-4 text-foreground" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-label="Next image"
          >
            <ChevronRight className="size-4 text-foreground" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIdx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const { data: services = [], isLoading, isError } = useServices();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const servicesWithIcons = useMemo(
    () =>
      services.map((s) => ({
        service: s,
        Icon: s.iconName ? getLucideIcon(s.iconName) : null,
      })),
    [services],
  );

  const handleApplyClick = (service: Service) => {
    setSelectedService(service);
    setIsDialogOpen(true);
  };

  return (
    <>
      <section className="relative overflow-hidden border-b-2 border-black py-14 md:py-14">
        <div className={`absolute inset-0 ${getHeaderBgClass(0)}`} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto max-w-3xl text-white text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              What We Offer
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl md:text-5xl">
              Our Services
            </h1>
            <p className="mt-3 leading-relaxed text-white text-base">
              Comprehensive learning solutions designed to help you succeed in your academic and professional journey.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="py-12 md:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-16">
          {isLoading && (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}

          {isError && (
            <p className="text-center text-destructive">
              Failed to load services. Please try again later.
            </p>
          )}

          {!isLoading && !isError && services.length === 0 && (
            <p className="text-center text-muted-foreground py-14">
              No services available yet.
            </p>
          )}

          {!isLoading && !isError && servicesWithIcons.length > 0 &&
            servicesWithIcons.map(({ service: s, Icon }, i) => {
              const isReversed = i % 2 !== 0;

              return (
                <motion.div
                  key={s.serviceId}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="overflow-hidden rounded-2xl border-2 border-black bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary hover:bg-primary/2"
                >
                  <div className={`px-6 py-3 ${getHeaderBgClass(i)}`}>
                    <div className="flex items-center gap-3">
                      {Icon && (
                        <div className="flex size-8 items-center justify-center rounded-lg bg-white/20">
                          <Icon className="size-4 text-white" />
                        </div>
                      )}
                      <h2 className="text-lg font-bold sm:text-xl text-white">
                        {s.title}
                      </h2>
                    </div>
                  </div>
                  <div className={`flex flex-col ${isReversed ? "md:flex-row-reverse" : "md:flex-row"}`}>
                    <div className="md:w-1/2">
                      <ServiceImageCarousel service={s} />
                    </div>
                    <div className="flex flex-1 flex-col justify-center p-6 md:p-8 lg:p-6 gap-4">
                      {s.description && (
                        <p className="text-sm leading-relaxed text-black sm:text-base whitespace-pre-wrap">
                          {s.description}
                        </p>
                      )}
                      <div className="pt-2">
                        <Button
                          onClick={() => handleApplyClick(s)}
                          className="w-full sm:w-auto"
                          size="lg"
                          variant="default"
                        >
                          Apply Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </main>

      {selectedService && (
        <ServiceApplicationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          service={selectedService}
        />
      )}
    </>
  );
}
