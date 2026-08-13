import { BarChart3, Layers, Lock, Zap } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Modular foundation",
    description:
      "Components are split into clear, reusable pieces so you can extend or replace them without breaking the whole page.",
  },
  {
    icon: Zap,
    title: "Fast by default",
    description:
      "Built on TanStack Start with Vite and Tailwind CSS v4 for a snappy developer experience and quick page loads.",
  },
  {
    icon: Lock,
    title: "Ready for auth",
    description:
      "Supabase is already connected. Add sign-up, sign-in, and protected routes whenever you are ready.",
  },
  {
    icon: BarChart3,
    title: "Data-driven pages",
    description:
      "Use TanStack server functions for type-safe backend logic and React Query for smooth, cached data fetching.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to start
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Swap the placeholder copy with your product details and keep the structure that works.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-border hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
