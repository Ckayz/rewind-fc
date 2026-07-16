/** Country name → flag emoji for WC 2026 participants (as named by TxLINE). */
const FLAGS: Record<string, string> = {
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  Bolivia: "🇧🇴",
  "Bosnia & Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  "Cape Verde": "🇨🇻",
  Colombia: "🇨🇴",
  "Congo DR": "🇨🇩",
  "Costa Rica": "🇨🇷",
  Croatia: "🇭🇷",
  Curacao: "🇨🇼",
  "Czech Republic": "🇨🇿",
  Denmark: "🇩🇰",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Haiti: "🇭🇹",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  Italy: "🇮🇹",
  "Ivory Coast": "🇨🇮",
  Jamaica: "🇯🇲",
  Japan: "🇯🇵",
  Jordan: "🇯🇴",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Norway: "🇳🇴",
  Panama: "🇵🇦",
  Paraguay: "🇵🇾",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Senegal: "🇸🇳",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Uruguay: "🇺🇾",
  USA: "🇺🇸",
  Uzbekistan: "🇺🇿",
  // friendlies that appear on the feed
  Vietnam: "🇻🇳",
  Myanmar: "🇲🇲",
  India: "🇮🇳",
  Algeria: "🇩🇿",
};

export function flag(country: string): string {
  return FLAGS[country] ?? "🏳️";
}

/** "🇪🇸 Spain" */
export function flagged(country: string): string {
  return `${flag(country)} ${country}`;
}
