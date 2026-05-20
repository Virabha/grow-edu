"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star,
  Users,
  BookOpen,
  Award,
  GraduationCap,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstructors } from "@/lib/hooks/use-cms";
import { useCourses } from "@/lib/hooks/use-courses";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08 },
  }),
};

const stagger = {
  show: { transition: { staggerChildren: 0.08 } },
};

const COLORS = ["#a07028", "#f97316", "#10b981", "#ec4899", "#0ea5e9", "#8b5cf6"];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function InstructorDetailPage() {
  const params = useParams();
  const userId = typeof params.slug === "string" ? params.slug : "";

  const { data: instructors, isLoading: loadingInstructors } = useInstructors();
  const instructor = instructors?.find((i) => i.userId === userId);

  const { data: coursesData, isLoading: loadingCourses } = useCourses(
    { instructorId: userId, limit: 20, status: "PUBLISHED" },
    !!userId
  );
  const courses = coursesData?.data ?? [];

  if (loadingInstructors) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-2 h-12 w-3/4" />
        <Skeleton className="h-32" />
      </main>
    );
  }

  if (!instructor) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-muted">
            <Users className="size-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Instructor Not Found
          </h1>
          <p className="mt-2 text-muted-foreground">
            The instructor you&apos;re looking for doesn&apos;t exist or has
            been removed.
          </p>
          <Link href="/instructors">
            <Button variant="default" className="mt-6">
              <ArrowLeft className="mr-2 size-4" />
              Back to Instructors
            </Button>
          </Link>
        </motion.div>
      </main>
    );
  }

  const color = COLORS[(instructors?.indexOf(instructor) ?? 0) % COLORS.length];

  return (
    <main>
        <section className="border-b border-border bg-white/20 backdrop-blur-sm pb-10 pt-6 md:pb-14 md:pt-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.nav
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground md:mb-8 md:text-sm"
            >
              <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
              <span>/</span>
              <Link href="/instructors" className="transition-colors hover:text-foreground">Instructors</Link>
              <span>/</span>
              <span className="font-medium text-foreground">{instructor.name}</span>
            </motion.nav>

            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
              >
                {instructor.avatarUrl ? (
                  <img
                    src={instructor.avatarUrl}
                    alt={instructor.name}
                    className="size-28 shrink-0 rounded-full object-cover shadow-lg sm:size-32 md:size-36"
                  />
                ) : (
                  <div
                    className="flex size-28 shrink-0 items-center justify-center rounded-full text-4xl font-black text-white shadow-lg sm:size-32 md:size-36 md:text-5xl"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                  >
                    {getInitials(instructor.name)}
                  </div>
                )}
              </motion.div>

              <motion.div
                initial="hidden"
                animate="show"
                variants={stagger}
                className="text-center md:text-left"
              >
                <motion.h1
                  variants={fadeUp}
                  className="text-2xl font-black text-foreground sm:text-3xl md:text-4xl"
                >
                  {instructor.name}
                </motion.h1>

                <motion.div
                  variants={fadeUp}
                  custom={2}
                  className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm md:justify-start"
                >
                  {instructor.experience && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="size-3.5" />
                      {instructor.experience}
                    </span>
                  )}
                  {instructor.education && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="size-3.5" />
                      {instructor.education}
                    </span>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={stagger}
              >
                {instructor.bio && (
                  <motion.div variants={fadeUp}>
                    <div className="flex items-center gap-2">
                      <Award className="size-5" style={{ color }} />
                      <h2 className="text-lg font-bold text-foreground sm:text-xl">About</h2>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {instructor.bio}
                    </p>
                  </motion.div>
                )}

                {instructor.expertise && instructor.expertise.length > 0 && (
                  <motion.div variants={fadeUp} custom={1} className="mt-8">
                    <div className="flex items-center gap-2">
                      <Award className="size-5" style={{ color }} />
                      <h2 className="text-lg font-bold text-foreground sm:text-xl">Expertise</h2>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {instructor.expertise.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 sm:text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {courses.length > 0 && (
          <section className="border-t border-border bg-muted/20 py-10 md:py-14">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="mb-6"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Courses</p>
                <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                  Courses by {instructor.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {courses.length} course{courses.length !== 1 && "s"} available
                </p>
              </motion.div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {courses.map((course, i) => (
                  <motion.div
                    key={course.courseId}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                  >
                    <Link
                      href={`/courses/${course.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-white/60 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/20 to-violet-500/10 sm:h-36">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="size-10 text-primary/30" />
                          </div>
                        )}
                        {course.level && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            {course.level}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-3 sm:p-4">
                        {course.category && (
                          <span className="mb-1.5 w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">
                            {course.category.name}
                          </span>
                        )}
                        <h3 className="line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-primary">
                          {course.title}
                        </h3>

                        <div className="mt-auto flex items-center justify-between border-t border-border pt-2.5 mt-2.5">
                          <span className="text-sm font-bold text-foreground">
                            ₹{parseFloat(course.price).toFixed(0)}
                          </span>
                          {course.compareAtPrice && (
                            <span className="text-[11px] text-muted-foreground line-through">
                              ₹{parseFloat(course.compareAtPrice).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-border py-10 md:py-14">
          <div className="container mx-auto px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <GraduationCap className="mx-auto mb-3 size-8" style={{ color }} />
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                Ready to learn from {instructor.name}?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Explore their courses and start learning today.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link href="/courses">
                  <Button size="lg">Browse All Courses</Button>
                </Link>
                <Link href="/instructors">
                  <Button variant="outline" size="lg">
                    <ArrowLeft className="mr-2 size-4" />
                    All Instructors
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
    </main>
  );
}
