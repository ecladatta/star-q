export type ParamSyncInput = {
  param: string | null
  live: string | null
  handledParam: string | null
  currentId: string | null
  paramFound: boolean
  annotationsLoaded: boolean
}

export type ParamSyncDecision
  = | { kind: 'ignore' }
    | { kind: 'close' }
    | { kind: 'clear' }
    | { kind: 'open', annotationId: string }

export function decideParamTransition(
  input: ParamSyncInput,
): { decision: ParamSyncDecision, handledParam: string | null } {
  if (input.live !== input.param) {
    return { decision: { kind: 'ignore' }, handledParam: input.handledParam }
  }

  if (input.param === input.handledParam) {
    return { decision: { kind: 'ignore' }, handledParam: input.handledParam }
  }

  if (input.param === input.currentId) {
    return { decision: { kind: 'ignore' }, handledParam: input.param }
  }

  if (!input.param) {
    return { decision: { kind: 'close' }, handledParam: null }
  }

  if (!input.paramFound) {
    return input.annotationsLoaded
      ? { decision: { kind: 'clear' }, handledParam: null }
      : { decision: { kind: 'ignore' }, handledParam: input.handledParam }
  }

  return { decision: { kind: 'open', annotationId: input.param }, handledParam: input.param }
}
