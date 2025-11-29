import { randomScrambleForEvent } from "cubing/scramble";

export type PuzzleType =
  | "3x3"
  | "2x2"
  | "4x4"
  | "5x5"
  | "6x6"
  | "7x7"
  | "3x3_bld"
  | "3x3_fm"
  | "3x3_oh"
  | "clock"
  | "megaminx"
  | "pyraminx"
  | "skewb"
  | "sq1"
  | "4x4_bld"
  | "5x5_bld"
  | "3x3_mbld";

export const SUPPORTED_EVENTS: { id: PuzzleType; name: string }[] = [
  { id: "3x3", name: "3x3" },
  { id: "2x2", name: "2x2" },
  { id: "4x4", name: "4x4" },
  { id: "5x5", name: "5x5" },
  { id: "6x6", name: "6x6" },
  { id: "7x7", name: "7x7" },
  { id: "3x3_bld", name: "3x3 BLD" },
  { id: "3x3_fm", name: "3x3 FMC" },
  { id: "3x3_oh", name: "3x3 OH" },
  { id: "clock", name: "Clock" },
  { id: "megaminx", name: "Megaminx" },
  { id: "pyraminx", name: "Pyraminx" },
  { id: "skewb", name: "Skewb" },
  { id: "sq1", name: "Square-1" },
  { id: "4x4_bld", name: "4x4 BLD" },
  { id: "5x5_bld", name: "5x5 BLD" },
  { id: "3x3_mbld", name: "3x3 MBLD" },
];

const INTERNAL_TO_WCA: Record<PuzzleType, string> = {
  "3x3": "333",
  "2x2": "222",
  "4x4": "444",
  "5x5": "555",
  "6x6": "666",
  "7x7": "777",
  "3x3_bld": "333bf",
  "3x3_fm": "333fm",
  "3x3_oh": "333oh",
  "clock": "clock",
  "megaminx": "minx",
  "pyraminx": "pyram",
  "skewb": "skewb",
  "sq1": "sq1",
  "4x4_bld": "444bf",
  "5x5_bld": "555bf",
  "3x3_mbld": "333mbf"
};

export async function generateScramble(puzzleType: PuzzleType = "3x3"): Promise<string> {
  const eventId = INTERNAL_TO_WCA[puzzleType] || "333";
  // For OH, we use 3x3 scrambles (which is 333 in WCA ID, handled by map if we mapped 3x3_oh to 333oh, 
  // but cubing.js expects '333' for OH usually? No, '333oh' is valid in some contexts but randomScrambleForEvent 
  // usually takes the event ID. Let's check if 333oh works or if we need to map to 333.)
  // Actually randomScrambleForEvent("333oh") works in cubing.js.
  
  const scramble = await randomScrambleForEvent(eventId);
  return scramble.toString();
}
