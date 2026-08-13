import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section id="pricing" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-16 text-center sm:px-16 sm:py-24">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl">
              Ready to make this yours?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-background/80">
              Start customizing the copy, design, and features. When you know the direction, we can build it out together.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-7 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-background/90"
              >
                Start building
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-full border border-background/30 px-7 py-3.5 text-base font-semibold text-background transition-colors hover:bg-background/10"
              >
                Contact us
              </a>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-terracotta/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-sage/30 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
