"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  User,
  Calendar,
  FileText,
  Globe,
  Building2,
  Hash,
  ShoppingCart,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookBySlug, usePurchaseBook, useMyBookPurchases } from "@/lib/hooks/use-books";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/utils";

function BookDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const { data: book, isLoading } = useBookBySlug(slug);
  const purchaseBook = usePurchaseBook();
  const { data: purchases } = useMyBookPurchases();

  const hasPurchased = purchases?.some(
    (p: { bookId: string }) => p.bookId === book?.bookId,
  );

  function handlePurchase() {
    if (!book) return;
    purchaseBook.mutate(
      {
        bookId: book.bookId,
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/failure`,
      },
      {
        onSuccess: (data) => {
          if (data.free) {
            toast.success("Book added to your library!");
            router.push("/books");
            return;
          }
          if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
          }
        },
        onError: (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Failed to purchase book"));
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <BookOpen className="size-16 text-muted-foreground/30" />
        <h2 className="mt-4 text-xl font-semibold">Book not found</h2>
        <Link href="/books" className="mt-4 text-primary hover:underline">
          Browse all books
        </Link>
      </div>
    );
  }

  const price = parseFloat(book.price);
  const comparePrice = book.compareAtPrice
    ? parseFloat(book.compareAtPrice)
    : null;
  const discount =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  const details = [
    { icon: User, label: "Author", value: book.author },
    book.publisher && { icon: Building2, label: "Publisher", value: book.publisher },
    book.pages && { icon: FileText, label: "Pages", value: `${book.pages} pages` },
    book.language && { icon: Globe, label: "Language", value: book.language },
    book.publishedYear && { icon: Calendar, label: "Year", value: String(book.publishedYear) },
    book.isbn && { icon: Hash, label: "ISBN", value: book.isbn },
    book.format && { icon: BookOpen, label: "Format", value: book.format },
  ].filter(Boolean) as { icon: typeof User; label: string; value: string }[];

  return (
    <>
      <section className="bg-[#1c1917]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center gap-1.5 text-xs text-white/60">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="size-3" />
            <Link href="/books" className="hover:text-white transition-colors">
              Books
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-white truncate max-w-[200px]">
              {book.title}
            </span>
          </nav>
          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                  {book.title}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-white/70">
                  <User className="size-4" />
                  {book.author}
                </p>
                {book.shortDescription && (
                  <p className="mt-4 text-sm text-white/60 max-w-2xl leading-relaxed">
                    {book.shortDescription}
                  </p>
                )}
              </motion.div>
            </div>
            <div className="hidden lg:flex items-start justify-center">
              <div className="relative w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl">
                {book.coverImage ? (
                  <Image
                    src={book.coverImage}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="200px"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-white/10">
                    <BookOpen className="size-16 text-white/30" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="lg:hidden flex justify-center -mt-8">
                <div className="relative w-40 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-4 border-white">
                  {book.coverImage ? (
                    <Image
                      src={book.coverImage}
                      alt={book.title}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      <BookOpen className="size-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </div>

              {details.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {details.map((d) => (
                    <div
                      key={d.label}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-white/50 p-3"
                    >
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <d.icon className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {d.label}
                        </p>
                        <p className="text-sm font-medium">{d.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {book.description && (
                <div>
                  <h2 className="text-lg font-bold mb-3">About This Book</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {book.description}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="sticky top-4 rounded-2xl border border-border/60 bg-white/80 p-6 shadow-sm">
                <div className="flex items-baseline gap-2">
                  {price === 0 ? (
                    <span className="text-2xl font-bold text-green-600">
                      Free
                    </span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">
                        ₹{price.toFixed(0)}
                      </span>
                      {comparePrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{comparePrice.toFixed(0)}
                        </span>
                      )}
                      {discount && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          {discount}% off
                        </span>
                      )}
                    </>
                  )}
                </div>

                {hasPurchased ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle className="size-5" />
                    <span className="font-medium">Already purchased</span>
                  </div>
                ) : (
                  <Button
                    className="mt-4 w-full gap-2 rounded-xl"
                    size="lg"
                    onClick={handlePurchase}
                    disabled={purchaseBook.isPending}
                  >
                    {purchaseBook.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="size-4" />
                        {price === 0 ? "Get for Free" : "Buy Now"}
                      </>
                    )}
                  </Button>
                )}

                {book.format && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Format: {book.format}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <BookDetailContent slug={slug} />;
}
