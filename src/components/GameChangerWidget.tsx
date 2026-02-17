import { useEffect, useRef } from "react";

const GameChangerWidget = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load the GC SDK script
    const script = document.createElement("script");
    script.src = "https://widgets.gc.com/static/js/sdk.v1.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).GC?.team?.schedule?.init) {
        (window as any).GC.team.schedule.init({
          target: "#gc-schedule-widget-44s1",
          widgetId: "ce44f476-dca7-49ff-a3e2-b11aa9c41335",
          maxVerticalGamesVisible: 2,
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      try { document.body.removeChild(script); } catch {}
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <div id="gc-schedule-widget-44s1" />
    </div>
  );
};

export default GameChangerWidget;
