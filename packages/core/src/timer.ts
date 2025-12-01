export type TimerState = "idle" | "inspection" | "ready" | "timing" | "stopped";

export interface TimerEventHandlers {
  onStateChange?: (state: TimerState) => void;
  onTick?: (ms: number) => void;
  onInspectionTick?: (remainingMs: number) => void;
  onStop?: (elapsedMs: number, penalty?: "plus2" | "DNF") => void;
}

export class TimerStateMachine {
  private state: TimerState = "idle";
  private startTimeMs: number | null = null;
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  private handlers: TimerEventHandlers;
  private isKeyDown: boolean = false;
  private keyDownTime: number = 0;
  private minHoldTime: number = 300; // Default 300ms
  private inspectionEnabled: boolean = false;
  
  // Inspection
  private inspectionStartTime: number | null = null;
  private inspectionDurationMs: number = 15000; // 15s standard
  private inspectionIntervalId: ReturnType<typeof setInterval> | null = null;
  private penalty: "plus2" | "DNF" | null = null;

  constructor(handlers: TimerEventHandlers = {}) {
    this.handlers = handlers;
  }

  public updateSettings(settings: { inspectionDurationMs?: number, holdDurationMs?: number, inspectionEnabled?: boolean }): void {
    if (settings.inspectionDurationMs !== undefined) {
      this.inspectionDurationMs = settings.inspectionDurationMs;
    }
    if (settings.holdDurationMs !== undefined) {
      this.minHoldTime = settings.holdDurationMs;
    }
    if (settings.inspectionEnabled !== undefined) {
      this.inspectionEnabled = settings.inspectionEnabled;
    }
  }

  public getState(): TimerState {
    return this.state;
  }

  public handleKeyDown(_code: string, opts?: { repeat?: boolean }): void {
    if (opts?.repeat) return; // ignore repeats for stability
    if (this.isKeyDown) return;
    this.isKeyDown = true;
    this.keyDownTime = Date.now();
    
    if (this.state === "idle" || this.state === "stopped") {
      this.transition("ready");
    } else if (this.state === "inspection") {
      // From inspection, we go to ready when space is held
      this.transition("ready");
    } else if (this.state === "timing") {
      this.stop();
    }
  }

  public handleKeyUp(_code: string): void {
    if (!this.isKeyDown) return;
    this.isKeyDown = false;
    
    const holdTime = Date.now() - this.keyDownTime;
    
    if (this.state === "ready") {
        // If coming from inspection, allow instant start (ignore minHoldTime)
        if (this.inspectionStartTime || holdTime >= this.minHoldTime) {
            if (this.inspectionEnabled && !this.inspectionStartTime) {
                this.startInspection();
            } else {
                this.start();
            }
        } else {
            // If released too early, go back to previous state
            if (this.inspectionStartTime) {
                this.transition("inspection");
            } else {
                this.transition("idle");
            }
        }
    }
  }

  public startInspection(): void {
    if (this.state !== "idle" && this.state !== "stopped") return;
    this.inspectionStartTime = Date.now();
    this.penalty = null;
    this.transition("inspection");
    
    this.inspectionIntervalId = setInterval(() => {
        if (!this.inspectionStartTime) return;
        const elapsed = Date.now() - this.inspectionStartTime;
        const remaining = Math.max(0, this.inspectionDurationMs - elapsed);
        
        this.handlers.onInspectionTick?.(remaining);

        if (remaining === 0) {
            // Inspection over, apply penalties
            // > 15s = +2
            // > 17s = DNF (usually)
            // For simplicity, let's just mark +2 after 15s, and DNF after 17s
            const overtime = elapsed - this.inspectionDurationMs;
            if (overtime > 2000) {
                this.penalty = "DNF";
                // Auto stop inspection? Or let them start with DNF?
                // Usually you can still start but it's a DNF.
            } else {
                this.penalty = "plus2";
            }
        }
    }, 100);
  }

  public start(): void {
    if (this.state === "timing") return;
    
    // Clear inspection if running
    if (this.inspectionIntervalId) {
        clearInterval(this.inspectionIntervalId);
        this.inspectionIntervalId = null;
    }

    this.startTimeMs = Date.now();
    this.transition("timing");
    this.tickIntervalId = setInterval(() => {
      if (this.startTimeMs == null) return;
      const elapsed = Date.now() - this.startTimeMs;
      this.handlers.onTick?.(elapsed);
    }, 10);
  }

  public stop(): void {
    if (this.state !== "timing" || this.startTimeMs == null) return;
    const elapsed = Date.now() - this.startTimeMs;
    this.clearTiming();
    this.transition("stopped");
    this.handlers.onStop?.(elapsed, this.penalty || undefined);
    
    // Reset inspection state
    this.inspectionStartTime = null;
    this.penalty = null;
  }

  public reset(): void {
    this.clearTiming();
    if (this.inspectionIntervalId) {
        clearInterval(this.inspectionIntervalId);
        this.inspectionIntervalId = null;
    }
    this.inspectionStartTime = null;
    this.penalty = null;
    this.transition("idle");
  }

  private clearTiming(): void {
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
    this.startTimeMs = null;
  }

  private transition(next: TimerState): void {
    if (this.state === next) return;
    this.state = next;
    this.handlers.onStateChange?.(this.state);
  }
}


