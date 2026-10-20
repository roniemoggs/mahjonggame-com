/**
 * High-performance Web Audio API synthesizer for Riichi Mahjong sound effects.
 * Zero external audio files, 100% reliable and latency-free across all modern browsers.
 */

class MahjongSoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Crisp tactile click sound when selecting/clicking a tile in hand.
   */
  public playTileClick(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  /**
   * Snappy wooden tile placement clack sound.
   */
  public playTileDiscard(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Dramatic Riichi declaration chime fanfare.
   */
  public playRiichi(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const start = ctx.currentTime + idx * 0.07;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.5);
      });
    } catch {}
  }

  /**
   * Triumphant victory fanfare for Tsumo or Ron.
   */
  public playWin(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C - E - G - C - E
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const start = ctx.currentTime + idx * 0.09;
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.65);
      });
    } catch {}
  }

  /**
   * Crisp double ping for Naki (Chi, Pon, Kan).
   */
  public playCall(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [659.25, 880]; // E5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const start = ctx.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {}
  }

  /**
   * Ascending coin counting / score tally chimes for point transfer.
   */
  public playPointTransfer(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const freqs = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const start = ctx.currentTime + idx * 0.05;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch {}
  }

  /**
   * Atmospheric Japanese bamboo / wooden tone for Ryukyoku (流局).
   */
  public playRyukyoku(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [329.63, 293.66, 261.63]; // E4, D4, C4
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const start = ctx.currentTime + idx * 0.14;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.55);
      });
    } catch {}
  }

  /**
   * Majestic orchestral grand fanfare for the final Game Over screen.
   */
  public playGameOver(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Grand victory chord arpeggio: C4 - G4 - C5 - E5 - G5 - C6
      const chord = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const start = ctx.currentTime + idx * 0.1;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 1.3);
      });
    } catch {}
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }
}

export const soundManager = new MahjongSoundManager();
