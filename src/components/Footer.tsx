import { Github, Twitter } from "lucide-react";

const footerLinks = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Changelog", "Roadmap"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Cookies"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                S
              </span>
              <span>Starter</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              A warm, modern starting point for your next web product. Built with TanStack Start, Tailwind CSS, and Supabase.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="GitHub">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Starter. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with Lovable
          </p>
        </div>
      </div>
    </footer>
  );
}
