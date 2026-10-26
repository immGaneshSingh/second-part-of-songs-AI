/**
 * Web Audio Melodic Synth Fallback
 * Provides synthesized musical tones if external MP3 streaming is restricted or slow.
 */

class MelodicSynthEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: number | null = null;
  private gainNode: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
        this.gainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(vol * 0.2, this.ctx.currentTime);
    }
  }

  public start() {
    this.initContext();
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;

    // Gentle arpeggiated ambient chord notes (C pentatonic / minor 7ths)
    const notes = [261.63, 311.13, 392.00, 466.16, 523.25, 622.25, 783.99];
    let noteIndex = 0;

    this.intervalId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;
      try {
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[noteIndex % notes.length], this.ctx.currentTime);
        noteIndex = (noteIndex + 1) % notes.length;

        noteGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        noteGain.gain.exponentialRampToValueAtTime(0.08, this.ctx.currentTime + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

        osc.connect(noteGain);
        noteGain.connect(this.gainNode);

        osc.start();
        osc.stop(this.ctx.currentTime + 1.3);
      } catch {
        // audio context safety
      }
    }, 600);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const melodicSynth = new MelodicSynthEngine();
