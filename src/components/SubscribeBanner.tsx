const CHANNEL_URL = "https://www.youtube.com/@Hawks12UAA?sub_confirmation=1";

const YouTubeIcon = () =>
<svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>;


const SubscribeBanner = () =>
<div
  className="relative overflow-hidden rounded-lg border border-primary/40"
  style={{ background: "linear-gradient(135deg, #0f2d1a 0%, #1a1208 60%, #0d1a0a 100%)" }}>

    <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
    <div
    className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20"
    style={{ background: "radial-gradient(circle, hsl(43 90% 55%), transparent 70%)" }} />

    <div className="px-5 pb-5 pt-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/favicon.ico" alt="Newmarket Hawks" className="h-14 w-14 shrink-0 brightness-0 invert drop-shadow-lg" style={{ display: 'none' }} onLoad={(e) => { e.currentTarget.style.removeProperty('display'); }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div>
          <p className="text-lg font-bold uppercase tracking-widest text-primary" style={{ fontFamily: "Oswald, sans-serif" }}>2026 SEASON STARTS SOON</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscribe to{" "}
            <span className="font-semibold text-primary">@Hawks12UAA</span> on YouTube to get notified when we go live.
          </p>
        </div>
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-700 active:bg-red-800">
          <YouTubeIcon />
          Subscribe
        </a>
      </div>
    </div>
  </div>;


export default SubscribeBanner;