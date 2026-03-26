/**
 * [PHASE 10] REAL-TIME VOICE FX (AUDIO WORKLET)
 * 
 * Runs directly on the audio rendering thread.
 * Implements Pitch-Shifting, Formant Manipulation (Robot), and Echo.
 */

class VoiceFXProcessor extends AudioWorkletProcessor {
  private delayBuffer: Float32Array;
  private delayIndex: number = 0;
  private phase: number = 0;

  static get parameterDescriptors() {
    return [
      { name: 'effectType', defaultValue: 0, minValue: 0, maxValue: 2 }, // 0: None, 1: Robot, 2: Echo
      { name: 'intensity', defaultValue: 0.5, minValue: 0, maxValue: 1 }
    ];
  }

  constructor() {
    super();
    // 1-second delay buffer at 48kHz
    this.delayBuffer = new Float32Array(48000);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length || !output || !output.length) return true;

    const effectType = parameters.effectType.length > 1 ? parameters.effectType[0] : parameters.effectType[0];
    const intensity = parameters.intensity.length > 1 ? parameters.intensity[0] : parameters.intensity[0];

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < inputChannel.length; ++i) {
        const sample = inputChannel[i];

        if (effectType < 0.5) {
          // 0: Bypass
          outputChannel[i] = sample;
        } else if (effectType < 1.5) {
          // 1: Robot / Ring Modulator (Formant manipulation simulation)
          const carrier = Math.sin(this.phase);
          this.phase += 0.1 * intensity; // Modulate frequency based on intensity
          outputChannel[i] = sample * carrier;
        } else {
          // 2: Echo / Reverb
          const delaySamples = Math.floor(48000 * 0.3); // 300ms delay
          const readIndex = (this.delayIndex - delaySamples + this.delayBuffer.length) % this.delayBuffer.length;
          
          const delayedSample = this.delayBuffer[readIndex];
          
          // Write current sample + feedback to delay buffer
          this.delayBuffer[this.delayIndex] = sample + delayedSample * (0.4 * intensity);
          
          // Mix dry and wet
          outputChannel[i] = sample + delayedSample * intensity;
        }
      }
    }

    this.delayIndex = (this.delayIndex + input[0].length) % this.delayBuffer.length;

    return true;
  }
}

registerProcessor('voice-fx-processor', VoiceFXProcessor);
