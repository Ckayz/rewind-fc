/**
 * Official FIFA YouTube highlight video IDs per fixture.
 * All IDs verified against the official FIFA channel via oEmbed.
 * null → Match Cinema falls back to a YouTube search deep-link.
 */
export const MATCH_VIDEOS: Record<string, string | null> = {
  "18241006": "oB2mK8eJli4", // England 1-2 Argentina — semifinal
  "18237038": "_cV8QcKp3GU", // France 0-2 Spain — semifinal
  "18218149": "VHoctq0AOg8", // Spain 2-1 Belgium — quarterfinal
  "18222446": "zZxxDbLxEi4", // Argentina 3-1 Switzerland — quarterfinal
};

export const LIVE_LINKS = [
  { label: "FIFA.com — official match hub", url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026" },
  { label: "FOX Sports (US broadcaster)", url: "https://www.foxsports.com/soccer/fifa-world-cup" },
  { label: "Telemundo Deportes (US, Spanish)", url: "https://www.telemundodeportes.com/" },
];
