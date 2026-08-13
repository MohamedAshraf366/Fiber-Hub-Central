const steps = [
  {
    number: "01",
    title: "Define your idea",
    description: "Replace the starter text with your value proposition, target audience, and core features.",
  },
  {
    number: "02",
    title: "Wire up your data",
    description: "Use Supabase tables and TanStack server functions to bring real data into your pages.",
  },
  {
    number: "03",
    title: "Ship and iterate",
    description: "Publish with one click, then refine the design and functionality based on feedback.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From idea to launch in three steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            This starter is designed to grow with you. Here is how you can make it yours.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-2xl border border-border/60 bg-card p-8"
            >
              <span className="text-5xl font-bold text-border">{step.number}</span>
              <h3 className="mt-6 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
