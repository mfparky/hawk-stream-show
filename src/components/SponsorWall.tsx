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
  /** Wrap logo in a bordered box — use for white/knockout logos on white bg */
  boxed?: boolean;
}

const SPONSORS: Sponsor[] = [
  { name: "AVP", logo: "/sponsors/AVP-Logo_Black.png", url: "https://streamthehawks.ca" },
  { name: "BYP", logo: "/sponsors/BYPVector.png", url: "https://streamthehawks.ca" },
  { name: "HVAC Trust", logo: "/sponsors/HVACTRUST.png", url: "https://streamthehawks.ca" },
  { name: "Reliance", logo: "/sponsors/ReliancelogoKO.png", url: "https://streamthehawks.ca", boxed: true },
  { name: "Tremcar", logo: "/sponsors/TremcarLOGO.png", url: "https://streamthehawks.ca" },
];

const SponsorWall = () => {
  if (SPONSORS.length === 0) return null;

  return (
    <div className="border-t border-border pt-6 pb-2 bg-white rounded-lg">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
        Stream brought to you by
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8">
        {SPONSORS.map((s) => (
          <div key={s.name} className={s.boxed ? "rounded border border-border px-3 py-2 bg-gray-700" : undefined}>
            <img src={s.logo} alt={s.name} className="h-9 sm:h-12 w-auto max-w-[120px] sm:max-w-[160px] object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SponsorWall;
