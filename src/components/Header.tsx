const CHANNEL_URL = "https://www.youtube.com/@Hawks12UAA?sub_confirmation=1";

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

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

      <a
        href={CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-800 shrink-0"
      >
        <YouTubeIcon />
        Subscribe
      </a>
    </div>
  </header>
);

export default Header;
