import { describe, expect, it } from 'vitest'
import { resolveEscapeAction } from './useKeyboardShortcuts'

describe('resolveEscapeAction', () => {
  it.each([
    { batchHasMentions: true, hasInProgressAnnotation: false, expected: 'exit-batch' },
    { batchHasMentions: true, hasInProgressAnnotation: true, expected: 'clear-annotation' },
    { batchHasMentions: false, hasInProgressAnnotation: true, expected: 'clear-annotation' },
    { batchHasMentions: false, hasInProgressAnnotation: false, expected: 'clear-annotation' },
  ])('staged batch without an in-progress annotation exits it ($batchHasMentions, $hasInProgressAnnotation -> $expected)', ({ batchHasMentions, hasInProgressAnnotation, expected }) => {
    expect(resolveEscapeAction({ batchHasMentions, hasInProgressAnnotation })).toBe(expected)
  })
})
