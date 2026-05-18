"use client";
import { motion } from "framer-motion";
const VALUES = [
  {
    title: "Accessibility",
    description:
      "We design learning with no prerequisites—so anyone can begin anytime.",
  },
  {
    title: "Empowerment",
    description:
      "We help learners build confidence, skills, and new professional pathways.",
  },
  {
    title: "Inclusivity",
    description:
      "We welcome people from all social, educational, and cultural backgrounds.",
  },
  {
    title: "Integrity",
    description:
      "We provide honest, practical knowledge without exaggerated promises.",
  },
  {
    title: "Innovation",
    description:
      "We use technology to simplify learning and remove barriers, not complicate them.",
  },
  {
    title: "Lifelong Learning",
    description: "We encourage continual personal and professional growth.",
  },
];

export function About() {
  return (
    <section
      className="py-10 sm:py-12 md:py-10 bg-background relative overflow-hidden"
      id="about"
      aria-labelledby="about-heading"
    >
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-0 left-1/4 w-[300px] sm:w-[400px] md:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] bg-[#000052] rounded-full blur-[80px] sm:blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] sm:w-[400px] md:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] bg-blue-500/5 rounded-full blur-[80px] sm:blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <header className="text-center mb-10 sm:mb-8 md:mb-10 max-w-4xl mx-auto bg-[#000052]">
          <motion.h2
            id="about-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-4 sm:mb-6"
          >
            About grotutor
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-4 sm:space-y-6 text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed"
          >
            <p>
              grotutor is a next-generation, online-only EdTech platform built
              to democratize access to high-quality learning. We believe that
              education should not be restricted by formal qualifications,
              expensive institutions, or rigid systems. Our mission is to
              empower individuals from all backgrounds—including those who may
              have missed opportunities earlier in life—to build meaningful
              skills, explore new career paths, and transform their future.
            </p>
            <p>
              Our platform offers practical, industry-aligned training modules
              that require no prior academic prerequisites. Whether you are
              starting a second career, upgrading your financial literacy, or
              seeking to understand modern digital industries, grotutor makes
              learning accessible, flexible, and affordable. We are committed to
              enabling millions of learners worldwide with tools that strengthen
              confidence, capability, and career growth.
            </p>
          </motion.div>
        </header>

        <div
          className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10 md:mb-24"
          role="group"
          aria-label="Mission and Vision"
        >
          <motion.article
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border/50 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:border-primary/50 transition-colors duration-300"
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-foreground">
              Mission
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              To make high-quality education accessible to everyone—regardless
              of background, academic history, or financial limitations—by
              providing practical, outcome-driven online learning that empowers
              real career transformation.
            </p>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border/50 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:border-blue-500/50 transition-colors duration-300"
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-foreground">
              Vision
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              To become a global catalyst for second-career success by building
              an inclusive, technology-driven learning ecosystem that unlocks
              opportunities for millions of aspiring learners.
            </p>
          </motion.article>
        </div>

        <div aria-labelledby="values-heading">
          <motion.h3
            id="values-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-10 md:mb-8"
          >
            Our Core Values
          </motion.h3>

          <ul
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 list-none p-0"
            role="list"
            aria-label="Core values"
          >
            {VALUES.map((value, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 hover:bg-card hover:border-primary/20 transition-all duration-300 h-full">
                  <h4 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-foreground">
                    {value.title}
                  </h4>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    {value.description}
                  </p>
                </article>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
