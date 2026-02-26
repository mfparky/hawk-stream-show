interface VenueMapProps {
  lat: number;
  lon: number;
  venueName: string;
}

const VenueMap = ({ lat, lon, venueName }: VenueMapProps) => {
  // Bounding box: ±0.015° around the venue (~1.5 km)
  const delta = 0.005;
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(",");
  const embedUrl =
    `https://www.openstreetmap.org/export/embed.html` + `?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  const linkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Venue</p>
        <p className="text-sm font-medium text-foreground mt-0.5 truncate">{venueName}</p>
      </div>
      <iframe
        src={embedUrl}
        title={`Map of ${venueName}`}
        className="w-full h-44 border-0"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="px-4 py-2 text-right">
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary hover:underline underline-offset-2"
        >
          Open in OpenStreetMap ↗
        </a>
      </div>
    </div>
  );
};

export default VenueMap;
