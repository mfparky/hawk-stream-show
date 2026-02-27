
## Conditional Layout: Sponsor Wall Position and Stream Height

### What changes

**1. YouTubeEmbed -- half-height when no stream**
- The "no stream available" placeholder currently uses `aspect-video` (16:9). Change it to `aspect-[32/9]` (half the height) so it takes up less space when idle.

**2. Move SponsorWall based on stream availability**
- In `Index.tsx`, the `activeUrl` already tells us whether a stream is available (non-empty string = stream, empty = no stream).
- When there is **no stream**: render `<SponsorWall />` directly after `<YouTubeEmbed />`, before the schedule/weather grid.
- When there **is a stream**: keep `<SponsorWall />` at the bottom (current position).

### Files to edit

**`src/components/YouTubeEmbed.tsx`**
- Line 56: change `aspect-video` to `aspect-[32/9]` in the no-video-id placeholder div.

**`src/pages/Index.tsx`**
- Render `<SponsorWall />` in two conditional spots:
  - Right after `<YouTubeEmbed />` when `!activeUrl` (no stream).
  - At the bottom of the page when `activeUrl` is truthy (stream active).

### Technical details

```text
Index.tsx layout:

  No stream:                    With stream:
  +-----------------------+     +-----------------------+
  | Header                |     | Header                |
  | Scoreboard            |     | Scoreboard            |
  | YouTubeEmbed (half h) |     | YouTubeEmbed (full h) |
  | SponsorWall           |     | Schedule | Weather    |
  | Schedule | Weather    |     | SponsorWall           |
  +-----------------------+     +-----------------------+
```
