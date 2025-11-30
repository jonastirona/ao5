export interface Solve {
  timeMs: number;
  penalty?: "plus2" | "DNF" | null;
}

export interface AveragesResult {
  ao5: number | null;
  ao12: number | null;
  ao100: number | null;
  best: number | null;
  worst: number | null;
}

function getEffectiveTime(solve: Solve): number {
  if (solve.penalty === "DNF") return Infinity;
  if (solve.penalty === "plus2") return solve.timeMs + 2000;
  return solve.timeMs;
}

function computeTrimmedAverage(solves: Solve[], size: number): number | null {
  if (solves.length < size) return null;
  
  const recent = solves.slice(-size);
  const times = recent.map(getEffectiveTime);
  
  // Check for DNF count
  const dnfCount = times.filter(t => t === Infinity).length;
  
  // WCA Rules:
  // Ao5: Remove best and worst. If > 1 DNF, average is DNF.
  // Ao12: Remove best and worst. If > 1 DNF, average is DNF.
  // Generally: Remove top 5% and bottom 5% (rounded up).
  
  let numTrim = 1;
  if (size >= 12) numTrim = 1; // Standard Ao12 removes 1 best, 1 worst
  if (size >= 100) numTrim = 5; // Standard Ao100 removes 5 best, 5 worst
  
  if (dnfCount > numTrim) return -1; // -1 indicates DNF average
  
  // Sort times
  times.sort((a, b) => a - b);
  
  // Remove best and worst
  const trimmed = times.slice(numTrim, -numTrim);
  
  const sum = trimmed.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / trimmed.length);
}

export function calculateAverages(solves: Solve[]): AveragesResult {
  const ao5 = computeTrimmedAverage(solves, 5);
  const ao12 = computeTrimmedAverage(solves, 12);
  const ao100 = computeTrimmedAverage(solves, 100);
  
  const validTimes = solves
    .map(getEffectiveTime)
    .filter(t => t !== Infinity);
    
  const best = validTimes.length > 0 ? Math.min(...validTimes) : null;
  const worst = validTimes.length > 0 ? Math.max(...validTimes) : null;

  return { ao5, ao12, ao100, best, worst };
}

export function getBestAverage(solves: Solve[], size: number): number | null {
  if (solves.length < size) return null;

  let bestAverage: number | null = null;

  // We need to calculate average for every window of 'size'
  // Optimization: For large number of solves, this might be slow if done naively.
  // But for typical cubing sessions (hundreds/thousands), O(N * size) is acceptable.
  // Especially since we only run this on PB check (end of solve).
  
  for (let i = 0; i <= solves.length - size; i++) {
    const window = solves.slice(i, i + size);
    const avg = computeTrimmedAverage(window, size);
    
    if (avg !== null && avg > 0 && avg !== -1) { // -1 is DNF
        if (bestAverage === null || avg < bestAverage) {
            bestAverage = avg;
        }
    }
  }
  
  return bestAverage;
}
