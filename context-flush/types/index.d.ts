export type Line = string

declare module 'claude-code' {
  interface PluginState {
    'context-flush': { line: Line }
  }
}
