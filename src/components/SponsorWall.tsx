/**
 * SponsorWall — "Stream brought to you by" logo strip.
 *
 * To add / update sponsors:
 *  1. Drop logo files into  public/sponsors/  (PNG or SVG with transparent background).
 *  2. Add an entry to the SPONSORS array below.
 *
 * Logo sizing: images are displayed at h-12 (48 px tall) with auto width.
 * Keep originals at 2× resolution (e.g. 96 px tall) for sharp rendering on
 * high-DPI screens.
 */

interface Sponsor {
  name: string;
  /** Path relative to /public — e.g. "/sponsors/acme.png" */
  logo: string;
  /** URL opened when the logo is clicked */
  url: string;
}

const SPONSORS: Sponsor[] = [
  // ── Add your sponsors here ───────────────────────────────────────────────
  // { name: "Sponsor Name", logo: "/sponsors/filename.png", url: "https://..." },
  // ────────────────────────────────────────────────────────────────────────
];

const SponsorWall = () => {
  if (SPONSORS.length === 0) return null;

  return (
    <div className="border-t border-border pt-6 pb-2">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
        Stream brought to you by
      </p>
      <div className="flex flex-wrap items-center justify-center gap-8">
        {SPONSORS.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.name}
          >
            <img
              src={s.logo}
              alt={s.name}
              className="h-12 w-auto max-w-[160px] object-contain"
            />
          </a>
        ))}
      </div>
    </div>
  );
};

export default SponsorWall;
