const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL_MS = 80;

/**
 * Spinner mínimo sin dependencias. No hace nada si stdout no es un TTY
 * (pipe, redirect, CI) - ahí un spinner solo ensucia la salida.
 */
export class Spinner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private frame = 0;

  constructor(private readonly message: string) {}

  start(): void {
    if (!process.stdout.isTTY || this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      process.stdout.write(`\r${FRAMES[this.frame] ?? ""} ${this.message}`);
      this.frame = (this.frame + 1) % FRAMES.length;
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (process.stdout.isTTY) {
      process.stdout.write(`\r${" ".repeat(this.message.length + 2)}\r`);
    }
  }
}
