export type Line = string

declare module 'claude-code' {
  interface PluginState {
    'polite-compaction': { line: Line }
  }
}
