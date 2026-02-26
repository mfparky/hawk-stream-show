interface HeaderProps {
  subtitle?: string;
}

const Header = ({ subtitle = "Live Baseball" }: HeaderProps) => (
  <header className="border-b border-border bg-card">
    <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
      <img src="/favicon.ico" alt="Newmarket Hawks" className="h-8 w-8 shrink-0 brightness-0 invert" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wider text-primary leading-none">
          Newmarket Hawks
        </h1>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
          {subtitle}
        </p>
      </div>
    </div>
  </header>
);

export default Header;
