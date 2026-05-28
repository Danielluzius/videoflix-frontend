// Minimal ambient type override for Plyr 3.x
// Needed because plyr/src/js/plyr.d.ts has conflicting `export =` + `export default`
// which causes TS1192 with moduleResolution: "bundler".
declare module 'plyr' {
  class Plyr {
    constructor(target: Element | string, options?: Plyr.Options);
    play(): Promise<void> | void;
    pause(): void;
    stop(): void;
    destroy(): void;
    quality: number;
    volume: number;
    muted: boolean;
    currentTime: number;
    duration: number;
    paused: boolean;
    playing: boolean;
    config: Plyr.Options;
  }
  namespace Plyr {
    interface Options {
      controls?: string[];
      settings?: string[];
      quality?: QualityOptions;
      i18n?: Record<string, unknown>;
      [key: string]: unknown;
    }
    interface QualityOptions {
      default: number;
      options: number[];
      forced?: boolean;
      onChange?: (quality: number) => void;
    }
  }
  export default Plyr;
}
