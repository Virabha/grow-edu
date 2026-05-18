"use client";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { TrustStats } from "@/components/sections/trust-stats";
import { CTA } from "@/components/sections/cta";
import { useCourses } from "@/features/courses/hooks/use-courses";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { Award, BookOpen, BriefcaseBusiness, Check, Compass, GraduationCap, Layers, LineChart, MonitorSmartphone, Users, Wand2, } from "lucide-react";
const TOPIC_TABS = [
    {
        id: "ai",
        label: "Artificial Intelligence (AI)",
        keywords: ["ai", "artificial intelligence", "machine learning", "genai"],
    },
    { id: "python", label: "Python", keywords: ["python"] },
    { id: "excel", label: "Microsoft Excel", keywords: ["excel"] },
    { id: "agents", label: "AI Agents & Agentic AI", keywords: ["agent", "agents"] },
    { id: "marketing", label: "Digital Marketing", keywords: ["marketing"] },
    { id: "aws", label: "Amazon AWS", keywords: ["aws", "cloud"] },
];
export function LandingPageClient() {
    const { data: featuredCourses, isLoading: coursesLoading } = useCourses({
        enabled: true,
        filters: {
            status: "PUBLISHED",
            limit: 6,
        },
    });
    const [activeTopicId, setActiveTopicId] = useState(TOPIC_TABS[0]?.id ?? "ai");
    const activeTopic = TOPIC_TABS.find((t) => t.id === activeTopicId) ?? TOPIC_TABS[0];
    const topicCourses = useMemo(() => {
        const list = featuredCourses?.data ?? [];
        const keywords = (activeTopic?.keywords ?? []).map((k) => k.toLowerCase());
        const matches = list.filter((course) => {
            const haystack = `${course.title ?? ""} ${course.description ?? ""} ${course.category?.name ?? ""}`.toLowerCase();
            return keywords.some((k) => haystack.includes(k));
        });
        return (matches.length > 0 ? matches : list).slice(0, 8);
    }, [activeTopic?.keywords, featuredCourses?.data]);
    return (<main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to main content
      </a>
      <Navbar />
      <div id="main-content">
        <Hero />
        <TrustStats />

        
        <section id="courses" className="py-16" aria-labelledby="skills-to-transform-heading">
          <div className="container mx-auto px-4">
            <header className="max-w-4xl">
              <h2 id="skills-to-transform-heading" className="text-3xl font-bold">
                Skills to transform your career and life
              </h2>
              <p className="mt-2 text-muted-foreground">
                From critical skills to technical topics, Loshi Edu supports your professional development.
              </p>
            </header>

            <div className="mt-8">
              <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-border pb-2">
                {TOPIC_TABS.map((tab) => {
            const isActive = tab.id === activeTopicId;
            return (<button key={tab.id} type="button" onClick={() => setActiveTopicId(tab.id)} className={[
                    "whitespace-nowrap text-sm font-semibold pb-2 transition-colors",
                    isActive ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground",
                ].join(" ")} aria-current={isActive ? "page" : undefined}>
                      {tab.label}
                    </button>);
        })}
              </div>

              <div className="mt-6">
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {coursesLoading ? (<div className="w-full">
                      <p className="text-muted-foreground">Loading courses…</p>
                    </div>) : topicCourses.length === 0 ? (<div className="w-full">
                      <p className="text-muted-foreground">No courses available yet. Check back soon!</p>
                    </div>) : (topicCourses.map((course) => (<div key={course.courseId} className="min-w-[280px] max-w-[280px]">
                        <Link href={`/learner/courses/${course.courseId}`} aria-label={`View ${course.title}`} className="group block">
                          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
                            {course.thumbnail ? (<Image src={course.thumbnail} alt={`${course.title} course thumbnail`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="280px"/>) : null}
                          </div>
                          <div className="mt-3 space-y-1">
                            <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:underline">
                              {course.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {course.description}
                            </p>
                            <div className="text-sm font-semibold">
                              ₹{parseFloat(course.price).toFixed(2)}
                            </div>
                          </div>
                        </Link>
                      </div>)))}
                </div>

                <div className="mt-6">
                  <Link href="/learner/courses" className="text-sm font-semibold text-primary hover:underline">
                    Show all {activeTopic?.label ?? "selected"} courses →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        
        <section id="why-loshi-edu" className="py-16" aria-labelledby="why-loshi-edu-heading">
          <div className="container mx-auto px-4">
            <motion.header initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 max-w-3xl mx-auto">
              <h2 id="why-loshi-edu-heading" className="text-3xl font-bold mb-4">
                A Modern Learning Platform Built for Results
              </h2>
              <p className="text-muted-foreground">
                Loshi Edu is a premium, outcomes-driven learning ecosystem that
                blends academic rigor with practical application. Every course is
                designed to deliver skills you can use immediately.
              </p>
            </motion.header>

            <ul className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 list-none p-0" role="list">
              {[
            {
                icon: <Users className="h-5 w-5"/>,
                title: "Expert Led Courses",
                description: "Learn from experienced industry professionals and academic specialists.",
            },
            {
                icon: <MonitorSmartphone className="h-5 w-5"/>,
                title: "Flexible Learning",
                description: "Study at your own pace on desktop, tablet, or mobile.",
            },
            {
                icon: <BriefcaseBusiness className="h-5 w-5"/>,
                title: "Real World Skills",
                description: "Courses focused on practical, job-relevant outcomes.",
            },
            {
                icon: <Award className="h-5 w-5"/>,
                title: "Certificates & Progress",
                description: "Track your learning journey and earn credible certificates.",
            },
        ].map((item) => (<li key={item.title} className="relative pl-12">
                  <div className="absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </li>))}
            </ul>
          </div>
        </section>

        
        <section id="categories" className="py-16 bg-muted/50" aria-labelledby="categories-heading">
          <div className="container mx-auto px-4">
            <motion.header initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 max-w-3xl mx-auto">
              <h2 id="categories-heading" className="text-3xl font-bold mb-4">
                Explore Learning Categories
              </h2>
              <p className="text-muted-foreground">
                Discover courses across high-demand domains. New categories and
                programs are added regularly.
              </p>
            </motion.header>

            <div className="max-w-5xl mx-auto">
              <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
              {(() => {
            const items = [
                {
                    icon: <Compass className="h-5 w-5"/>,
                    title: "Business and Leadership",
                    description: "Strategy, management, entrepreneurship, and leadership development.",
                },
                {
                    icon: <Layers className="h-5 w-5"/>,
                    title: "Technology and Data",
                    description: "Programming, artificial intelligence, data analytics, cloud, and cybersecurity.",
                },
                {
                    icon: <LineChart className="h-5 w-5"/>,
                    title: "Finance & Accounting",
                    description: "Financial literacy, accounting fundamentals, budgeting, and business finance.",
                },
                {
                    icon: <Wand2 className="h-5 w-5"/>,
                    title: "Creative and Design",
                    description: "UX UI, visual design, branding, content creation, and storytelling.",
                },
                {
                    icon: <BookOpen className="h-5 w-5"/>,
                    title: "Professional Skills",
                    description: "Communication, project management, productivity, and decision making.",
                },
                {
                    icon: <GraduationCap className="h-5 w-5"/>,
                    title: "Academic and Test Preparation",
                    description: "Foundational subjects and exam readiness programs.",
                },
                {
                    icon: <Users className="h-5 w-5"/>,
                    title: "Business School Admissions & Career Pathways",
                    description: "MBA and MiM strategy, essays, interviews, research, and career planning.",
                },
            ];
            return items.map((item, idx) => {
                const isOddCount = items.length % 2 === 1;
                const isLast = idx === items.length - 1;
                const centerLast = isOddCount && isLast;
                return (<div key={item.title} className={[
                        "flex gap-4",
                        centerLast ? "md:col-span-2 md:justify-self-center md:max-w-2xl" : "",
                    ].join(" ")}>
                  <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background/60 text-primary border border-border/40">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>);
            });
        })()}
              </div>
            </div>

            <div className="text-center mt-10">
              <Link href="/learner/courses" aria-label="Explore all categories">
                <Button variant="outline">Explore All Categories</Button>
              </Link>
            </div>
          </div>
        </section>

        
        <section className="py-16" aria-labelledby="designed-for-results-heading">
          <div className="container mx-auto px-4">
            <motion.header initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 max-w-3xl mx-auto">
              <h2 id="designed-for-results-heading" className="text-3xl font-bold mb-4">
                Designed for Learners Who Want Results
              </h2>
              <p className="text-muted-foreground">
                Loshi Edu is built to support every stage of your growth.
              </p>
            </motion.header>

            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="max-w-xl">
                <ul className="space-y-4" role="list">
                  {[
            {
                title: "Personalised Learning Paths",
                description: "Choose courses aligned with your goals and experience level.",
            },
            {
                title: "Interactive Learning Experience",
                description: "Videos, quizzes, projects, and case-based learning.",
            },
            {
                title: "Mentor Support and Community",
                description: "Connect with instructors and fellow learners.",
            },
            {
                title: "Mobile Ready and On Demand",
                description: "Access your courses anytime, anywhere.",
            },
        ].map((item) => (<li key={item.title} className="flex gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-4 w-4"/>
                      </span>
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </li>))}
                </ul>
              </div>

              <div className="relative">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 blur-2xl"/>
                <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-3xl bg-background/40 border border-border/30">
                  <Image src="/illustrations/engineering_team.svg" alt="" fill className="object-contain p-8" priority={false}/>
                </div>
              </div>
            </div>
          </div>
        </section>

        
        <section className="py-18 sm:py-20 relative" aria-labelledby="plans-heading">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-muted/20 to-transparent" aria-hidden="true"/>
          <div className="container mx-auto px-4">
            <header className="max-w-4xl">
              <h2 id="plans-heading" className="text-3xl font-bold">
                Grow your team&apos;s skills and your business
              </h2>
              <p className="mt-2 text-muted-foreground">
                Reach goals faster with one of our plans or programs. Try one free today or contact sales to learn more.
              </p>
            </header>

            <div className="mt-10 grid gap-6 lg:grid-cols-3 items-stretch">
              {[
            {
                accent: "from-primary/25 to-transparent",
                icon: <Users className="h-5 w-5"/>,
                title: "Team Plan",
                subtitle: "2 to 50 people — For your team",
                cta: "Start subscription",
                price: "From $X / month per user",
                note: "Billed annually. Cancel anytime.",
                bullets: [
                    "Access to top courses",
                    "Certification prep",
                    "Goal-focused recommendations",
                    "AI-powered coaching",
                    "Analytics and adoption reports",
                ],
            },
            {
                accent: "from-secondary/25 to-transparent",
                icon: <BriefcaseBusiness className="h-5 w-5"/>,
                title: "Enterprise Plan",
                subtitle: "More than 20 people — For your organisation",
                cta: "Request a demo",
                price: "Contact sales for pricing",
                bullets: [
                    "Access to course library",
                    "Certification prep",
                    "Goal-focused recommendations",
                    "AI-powered coaching",
                    "Advanced analytics and insights",
                    "Dedicated customer success team",
                    "International course collection",
                    "Customisable content",
                ],
            },
            {
                accent: "from-primary/25 to-transparent",
                icon: <Wand2 className="h-5 w-5"/>,
                title: "AI Fluency",
                subtitle: "From AI foundations to transformation",
                cta: "Contact Us",
                blocks: [
                    {
                        title: "AI Readiness Collection",
                        description: "Build organisation-wide AI fluency fast with curated courses and guided learning.",
                    },
                    {
                        title: "AI Growth Collection",
                        description: "Scale AI and technical expertise with specialised courses and role-based learning paths.",
                    },
                ],
            },
        ].map((plan) => (<div key={plan.title} className="relative h-full rounded-3xl border border-border/30 bg-background/30 backdrop-blur-sm overflow-hidden shadow-[0_20px_60px_-45px_rgba(0,0,0,0.8)] hover:border-border/50 transition-colors">
                  <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${plan.accent}`} aria-hidden="true"/>
                  <div className="relative p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/40 border border-border/30 text-primary">
                          {plan.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">{plan.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        {plan.cta}
                      </Button>
                    </div>

                    {"price" in plan ? (<div className="mt-6">
                        <p className="font-semibold text-foreground">{plan.price}</p>
                        {"note" in plan && plan.note ? (<p className="text-sm text-muted-foreground">{plan.note}</p>) : null}
                      </div>) : null}

                    {"bullets" in plan && Array.isArray(plan.bullets) ? (<ul className="mt-5 space-y-2.5 text-sm" role="list">
                        {plan.bullets.map((t) => (<li key={t} className="flex gap-2">
                            <Check className="h-4 w-4 text-emerald-400 mt-0.5"/>
                            <span className="text-foreground/90">{t}</span>
                          </li>))}
                      </ul>) : null}

                    {"blocks" in plan && Array.isArray(plan.blocks) ? (<div className="mt-6 space-y-5">
                        {plan.blocks.map((b) => (<div key={b.title} className="border-t border-border/30 pt-4 first:border-t-0 first:pt-0">
                            <p className="font-semibold text-foreground/95">{b.title}</p>
                            <p className="text-sm text-muted-foreground">{b.description}</p>
                          </div>))}
                      </div>) : null}
                  </div>
                </div>))}
            </div>
          </div>
        </section>

        
        <section className="py-16 bg-muted/50" aria-labelledby="popular-skills-heading">
          <div className="container mx-auto px-4">
            <h2 id="popular-skills-heading" className="text-3xl font-bold">
              Popular Skills
            </h2>

            <div className="mt-8 grid gap-10 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3">
                  <Image src="/illustrations/focused.svg" alt="" width={36} height={36} className="opacity-80" aria-hidden="true"/>
                  <p className="text-lg font-semibold">Trending skills</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Explore courses across in-demand skills and career pathways.
                </p>
                <div className="mt-4 space-y-3">
                  <Link href="/learner/courses" className="inline-block text-sm font-semibold text-primary hover:underline">
                    See trending skills →
                  </Link>
                  <div>
                    <Link href="/learner/courses">
                      <Button variant="outline" className="w-full">
                        Show all trending skills
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 grid gap-8 md:grid-cols-3">
                {[
            {
                title: "Development",
                items: ["Python", "Web Development", "Data Science"],
                imageSrc: "/illustrations/engineering_team.svg",
            },
            {
                title: "Design",
                items: ["UX Design", "Graphic Design", "Product Design"],
                imageSrc: "/illustrations/pending_approval.svg",
            },
            {
                title: "Business",
                items: ["Project Management", "Business Strategy", "Power BI"],
                imageSrc: "/illustrations/analytics_setup.svg",
            },
        ].map((col) => (<div key={col.title}>
                    <div className="flex items-center gap-3">
                      <Image src={col.imageSrc} alt="" width={32} height={32} className="opacity-80" aria-hidden="true"/>
                      <p className="text-lg font-semibold">{col.title}</p>
                    </div>
                    <div className="mt-3 space-y-3">
                      {col.items.map((item) => (<Link key={item} href="/learner/courses" className="block text-sm font-semibold text-primary hover:underline">
                          {item} →
                        </Link>))}
                    </div>
                  </div>))}
              </div>
            </div>
          </div>
        </section>

        
        <section id="how-it-works" className="py-16" aria-labelledby="how-it-works-heading">
          <div className="container mx-auto px-4">
            <motion.header initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 max-w-3xl mx-auto">
              <h2 id="how-it-works-heading" className="text-3xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground">Getting started is simple.</p>
            </motion.header>

            <ol className="relative grid gap-10 md:grid-cols-3" aria-label="Getting started steps">
              {[
            {
                step: "1",
                title: "Browse Courses",
                description: "Explore categories and select a course.",
            },
            {
                step: "2",
                title: "Enroll and Learn",
                description: "Access high-quality lessons and resources.",
            },
            {
                step: "3",
                title: "Earn Your Certificate",
                description: "Complete the course and showcase your achievement.",
            },
        ].map((item) => (<li key={item.step} className="relative">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{item.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </li>))}
            </ol>

            <div className="text-center mt-10">
              <Link href="/signup" aria-label="Get started with Loshi Edu">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </section>

        
        <section className="py-16 bg-muted/50" aria-labelledby="who-we-serve-heading">
          <div className="container mx-auto px-4">
            <motion.header initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 max-w-3xl mx-auto">
              <h2 id="who-we-serve-heading" className="text-3xl font-bold mb-4">
                Who We Serve
              </h2>
              <p className="text-muted-foreground">
                Loshi Edu supports individuals and organisations.
              </p>
            </motion.header>

            <div className="grid gap-10 md:grid-cols-3">
              {[
            {
                icon: <GraduationCap className="h-5 w-5"/>,
                title: "Students and Graduates",
                description: "Build strong foundations and career readiness.",
            },
            {
                icon: <BriefcaseBusiness className="h-5 w-5"/>,
                title: "Working Professionals",
                description: "Upskill or reskill for career growth.",
            },
            {
                icon: <Users className="h-5 w-5"/>,
                title: "Organisations and Teams",
                description: "Train and develop your workforce.",
            },
        ].map((item) => (<div key={item.title} className="relative pl-12">
                  <div className="absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 border border-border/40 text-primary">
                    {item.icon}
                  </div>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>))}
            </div>
          </div>
        </section>

        <CTA />
      </div>
      <Footer />
    </main>);
}
