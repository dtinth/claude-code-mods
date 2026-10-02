import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const line = atom({ plugin: 'context-flush', key: 'line' } as const, '')

const READY = '<ready-for-compaction/>'
const RETRIES = 20
const RETRY_MS = 500

const kilo = (n: number) => `${Math.round(n / 1000)}k`

const statusText = (tokens?: number, window?: number, usd?: number) => {
  const ctx =
    tokens === undefined
      ? 'ctx –'
      : `ctx ${kilo(tokens)}${window ? ` / ${kilo(window)} (${Math.round((tokens / window) * 100)}%)` : ''}`
  return usd === undefined ? ctx : `${ctx} · $${usd.toFixed(2)}`
}

export const register: Register = (on, options) => {
  const threshold = Number(options.thresholdTokens)

  // 'armed': may ask when the threshold is crossed. 'asking': the agent was
  // asked and has not said ready. 'compacting': the compaction is on its way.
  // Asked once per crossing: it arms again when the context falls below.
  let phase: 'armed' | 'asking' | 'compacting' | 'spent' = 'armed'

  on('session.start', async ($, e, next) => {
    const { context, cost } = await $.session.usage()
    await update($, line, () => statusText(context.tokens, context.window, cost?.usd))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const { tokens, window } = e.context
    await update($, line, () => statusText(tokens, window, e.cost?.usd))

    if (tokens !== undefined && tokens < threshold) phase = 'armed'

    if (tokens !== undefined && tokens >= threshold && phase === 'armed') {
      phase = 'asking'
      void $.prompt.submit({
        text:
          `Context window reached ${kilo(tokens)} tokens. The conversation will be compacted soon. ` +
          `If there is anything to flush, please do so now, so you can continue well after compaction. ` +
          `When you are ready, end your reply with ${READY}`,
      })
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined || phase !== 'asking') return next(e)

    if (e.isAborted || e.reason === 'error') {
      phase = 'spent'
      return next(e)
    }

    if (e.answer.slice(-200).includes(READY)) {
      phase = 'compacting'
      // compact() rejects while a turn runs, and this turn ends after this
      // hook returns, so try again shortly.
      const attempt = (left: number): void => {
        $.clock.after(RETRY_MS, async () => {
          try {
            const { skip } = await $.session.compact()
            if (skip !== undefined) {
              phase = 'spent'
            } else {
              phase = 'armed'
              const { context, cost } = await $.session.usage()
              await update($, line, () => statusText(context.tokens, context.window, cost?.usd))
            }
          } catch {
            if (left > 0) attempt(left - 1)
            else phase = 'spent'
          }
        })
      }
      attempt(RETRIES)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const text = await read($, line)
    if (e.props.hasSurvey || text === '') return next(e)

    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{text}</Text>
  })
}
