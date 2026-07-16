/** Sample goal scripts per fixture — replaced by real TxLINE event data. */
export const SAMPLE_GOALS: Record<
  string,
  { minute: number; team: "p1" | "p2"; scorer: string }[]
> = {
  "sample-sf1": [
    { minute: 23, team: "p1", scorer: "Yamal" },
    { minute: 67, team: "p1", scorer: "Olmo" },
  ],
  "sample-sf2": [
    { minute: 12, team: "p1", scorer: "Álvarez" },
    { minute: 41, team: "p2", scorer: "Kane" },
    { minute: 55, team: "p1", scorer: "Mac Allister" },
    { minute: 88, team: "p1", scorer: "Garnacho" },
  ],
  "sample-qf1": [
    { minute: 35, team: "p1", scorer: "Mbappé" },
    { minute: 79, team: "p2", scorer: "En-Nesyri" },
  ],
  "sample-qf2": [
    { minute: 18, team: "p1", scorer: "Yamal" },
    { minute: 52, team: "p1", scorer: "Pedri" },
    { minute: 83, team: "p1", scorer: "Oyarzabal" },
  ],
  "sample-qf3": [
    { minute: 29, team: "p2", scorer: "Haaland" },
    { minute: 61, team: "p1", scorer: "Saka" },
    { minute: 90, team: "p1", scorer: "Bellingham" },
  ],
  "sample-qf4": [
    { minute: 9, team: "p1", scorer: "Messi" },
    { minute: 22, team: "p2", scorer: "Díaz" },
    { minute: 47, team: "p1", scorer: "Lautaro" },
    { minute: 63, team: "p2", scorer: "James" },
    { minute: 71, team: "p1", scorer: "Messi" },
    { minute: 90, team: "p2", scorer: "Durán" },
  ],
  "sample-r16-1": [
    { minute: 15, team: "p1", scorer: "Pedri" },
    { minute: 33, team: "p2", scorer: "Ronaldo" },
    { minute: 58, team: "p1", scorer: "Morata" },
    { minute: 81, team: "p2", scorer: "Leão" },
  ],
  "sample-r16-2": [
    { minute: 21, team: "p1", scorer: "Mbappé" },
    { minute: 44, team: "p1", scorer: "Griezmann" },
    { minute: 76, team: "p1", scorer: "Dembélé" },
  ],
  "sample-r16-3": [
    { minute: 38, team: "p1", scorer: "Haaland" },
    { minute: 50, team: "p2", scorer: "Vinícius" },
    { minute: 85, team: "p1", scorer: "Ødegaard" },
  ],
  "sample-r16-4": [
    { minute: 8, team: "p1", scorer: "De Bruyne" },
    { minute: 27, team: "p2", scorer: "Pulisic" },
    { minute: 39, team: "p1", scorer: "Doku" },
    { minute: 54, team: "p2", scorer: "Reyna" },
    { minute: 66, team: "p1", scorer: "Lukaku" },
    { minute: 78, team: "p2", scorer: "Balogun" },
    { minute: 89, team: "p1", scorer: "Trossard" },
  ],
};
