import { generateScramble } from "../dist/scramble.js";
import { TimerStateMachine } from "../dist/timer.js";
import { calculateAverages } from "../dist/stats.js";

async function testScramble() {
  const s = await generateScramble("3x3");
  console.log("SCRAMBLE:", s);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testTimer() {
  const logs = [];
  const timer = new TimerStateMachine({
    onStateChange: (st) => logs.push(["state", st]),
    onInspectionTick: (left) => logs.push(["inspect", left]),
    onTick: (ms) => {
      if (ms % 200 < 10) logs.push(["tick", ms]);
    },
    onStop: (ms) => logs.push(["stop", ms])
  }, 2);

  timer.handleKeyDown("Space");
  await delay(100);
  timer.handleKeyUp("Space");
  await delay(500);
  timer.handleKeyDown("Space");
  await delay(100);
  timer.handleKeyUp("Space");
  await delay(300);
  timer.handleKeyDown("Space");
  await delay(10);
  timer.handleKeyUp("Space");

  console.log("TIMER_LOGS:", JSON.stringify(logs));
}

function testStats() {
  const times = [1200, 1100, 2000, 1500, 1300, 1250, 1400, 1600, 1700, 1800, 1900, 2100, 2200];
  const res = calculateAverages(times);
  console.log("STATS:", res);
}

await testScramble();
await testTimer();
testStats();


