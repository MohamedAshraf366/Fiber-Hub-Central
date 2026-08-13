import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          <Sparkles className="h-4 w-4 text-terracotta" />
          <span>Your next idea starts here</span>
        </div>

        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Build something{" "}
          <span className="gradient-text">meaningful</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-8 text-muted-foreground sm:text-xl">
          A clean, modern foundation for your next product. Replace this starter
          with your own content, features, and brand while keeping the
          polished structure.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#features"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-base font-semibold text-background transition-all hover:bg-foreground/90 hover:shadow-lg"
          >
            Explore features
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
          >
            View demo
          </a>
        </div>
      </div>

      {/* Abstract decorative shapes */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-terracotta/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-sage/10 blur-3xl" />
    </section>
  );
}
