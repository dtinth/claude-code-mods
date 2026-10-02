import { expect, mock, test } from 'claude-code/testing'

const READY = '<ready-for-compaction/>'

const measure = (tokens: number) => ({
  context: { tokens, window: 1_000_000, percent: Math.round(tokens / 10_000) },
  rateLimits: [],
  cost: { usd: tokens / 100_000 },
  changed: ['context' as const],
})

const done = (answer: string) => ({
  answer,
  durationMs: 1,
  isAborted: false,
  turnId: 't1',
  reason: 'answer' as const,
})

test('asks once at the threshold, compacts when the agent says ready', async ($, on) => {
  const clock = mock.clock(on)
  const asked: string[] = []
  let compactions = 0

  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('prompt.submit', (_$, e) => {
    asked.push(e.text)
    return { text: e.text }
  })
  on('session.compact', () => {
    compactions += 1
    return { skip: 'test' }
  })

  await $.session.measure(measure(100_000))
  expect(asked.length).toBe(0)

  await $.session.measure(measure(310_000))
  await clock.settle()
  expect(asked.length).toBe(1)
  expect(asked[0]).toContain('310k')
  expect(asked[0]).toContain(READY)

  // Still above the threshold: no second ask.
  await $.session.measure(measure(320_000))
  await clock.settle()
  expect(asked.length).toBe(1)

  // The agent flushes but is not ready yet: no compaction.
  await $.turn.complete(done('Writing notes.'))
  await clock.advance(1000)
  expect(compactions).toBe(0)

  await $.turn.complete(done(`Notes saved to NOTES.md.\n${READY}`))
  await clock.advance(1000)
  expect(compactions).toBe(1)
  const ui = await $.ui.mount({
    plugin: 'context-flush',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false },
  })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('ctx 320k / 1000k (32%) · $3.20')
})
