export function AppFooter() {
  return (
    <footer className="mt-auto w-full border-t border-border/70 bg-background/60 py-6 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 text-center">
        <p className="text-sm font-medium">
          © {new Date().getFullYear()} <span className="text-brand-gradient font-bold">Mohamed Ashraf</span>
        </p>
        <p className="text-xs text-muted-foreground">
          جميع الحقوق محفوظة — All rights reserved to Mohamed Ashraf
        </p>
      </div>
    </footer>
  );
}
