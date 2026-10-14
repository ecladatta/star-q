import { describe, expect, it } from 'vitest'
import { decideParamTransition } from './annotation-param-sync'

const base = {
  param: null,
  live: null,
  handledParam: null,
  currentId: null,
  paramFound: false,
  annotationsLoaded: true,
} as const

describe('decideParamTransition', () => {
  it('adopts a deep link once', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      param: 'a1',
      live: 'a1',
      paramFound: true,
    })

    expect(decision).toEqual({ kind: 'open', annotationId: 'a1' })
    expect(handledParam).toBe('a1')
  })

  it('ignores the replay of an already adopted param', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      param: 'a1',
      live: 'a1',
      handledParam: 'a1',
      paramFound: true,
    })

    expect(decision).toEqual({ kind: 'ignore' })
    expect(handledParam).toBe('a1')
  })

  it('ignores a stale echo of a superseded write', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      param: 'a1',
      live: null,
      paramFound: true,
    })

    expect(decision).toEqual({ kind: 'ignore' })
    expect(handledParam).toBeNull()
  })

  it('adopts an external param change', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      param: 'a2',
      live: 'a2',
      handledParam: 'a1',
      currentId: 'a1',
      paramFound: true,
    })

    expect(decision).toEqual({ kind: 'open', annotationId: 'a2' })
    expect(handledParam).toBe('a2')
  })

  it('closes when the param is removed while an annotation is open', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      handledParam: 'a1',
      currentId: 'a1',
    })

    expect(decision).toEqual({ kind: 'close' })
    expect(handledParam).toBeNull()
  })

  it('treats an empty param as a removal', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      param: '',
      live: '',
      handledParam: 'a1',
      currentId: 'a1',
    })

    expect(decision).toEqual({ kind: 'close' })
    expect(handledParam).toBeNull()
  })

  it('ignores a removal while nothing is open', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      handledParam: 'a1',
    })

    expect(decision).toEqual({ kind: 'ignore' })
    expect(handledParam).toBeNull()
  })

  it('ignores a param that already names the open annotation', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      param: 'a1',
      live: 'a1',
      handledParam: 'a2',
      currentId: 'a1',
      paramFound: true,
    })

    expect(decision).toEqual({ kind: 'ignore' })
    expect(handledParam).toBe('a1')
  })

  it('clears the param when the loaded list does not contain it', () => {
    const { decision, handledParam } = decideParamTransition({
      ...base,
      param: 'missing',
      live: 'missing',
      paramFound: false,
    })

    expect(decision).toEqual({ kind: 'clear' })
    expect(handledParam).toBeNull()
  })

  it('retries after the annotation list loads', () => {
    const before = decideParamTransition({
      ...base,
      param: 'a1',
      live: 'a1',
      paramFound: false,
      annotationsLoaded: false,
    })
    expect(before.decision).toEqual({ kind: 'ignore' })
    expect(before.handledParam).toBeNull()

    const after = decideParamTransition({
      ...base,
      param: 'a1',
      live: 'a1',
      handledParam: before.handledParam,
      paramFound: true,
    })
    expect(after.decision).toEqual({ kind: 'open', annotationId: 'a1' })
  })
})
