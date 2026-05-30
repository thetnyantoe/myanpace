export function playNotificationSound(notifType: string): void {
  try {
    const ctx = new (
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
    const isYourTurn =
      notifType === "called" || notifType === "immediate_call";
    const isWarning = notifType === "warning";
    const isCanceled = notifType === "canceled";

    const beep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    if (isYourTurn) {
      beep(880, ctx.currentTime, 0.35);
      beep(1100, ctx.currentTime + 0.42, 0.45);
    } else if (isWarning) {
      beep(400, ctx.currentTime, 0.4);
      beep(400, ctx.currentTime + 0.5, 0.4);
    } else if (isCanceled) {
      beep(250, ctx.currentTime, 0.6);
    } else {
      beep(660, ctx.currentTime, 0.5);
    }
  } catch {
    // Audio blocked by browser policy
  }
}
