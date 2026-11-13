// One fix the band lists: the flagged text and what goes over it ('' removes it).
export type Fix = { from: string; to: string; by: string }

declare module 'claude-code' {
  interface PluginState {
    // rev: bumped on each settings change so the settings pane draws again.
    'bgh': { fixes: Shaped<Fix[]>; rev: number }
  }
}
