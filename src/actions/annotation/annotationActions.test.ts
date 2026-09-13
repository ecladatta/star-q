import type { DocumentAnnotationComponent } from '@/types/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '@/lib/auth-utils'
import { MAX_ANNOTATIONS_PER_BATCH } from '@/lib/constants'
import { addAnnotations } from './annotationActions'

const { insertMock, transactionMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  transactionMock: vi.fn(),
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([]),
    transaction: transactionMock,
  },
}))
vi.mock('@/lib/auth-utils', () => ({ requireAuth: vi.fn().mockResolvedValue('user-1'), NotFoundError: class NotFoundError extends Error {} }))
vi.mock('@/lib/corpus-access', () => ({ requireEditDocument: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  // select({corpusId}).from(document).where(...) -> one row
  vi.mocked(requireAuth).mockResolvedValue('user-1')
  insertMock.mockReturnValue([{ id: 'a-1' }])
})

describe('addAnnotations', () => {
  it(`rejects batches larger than ${MAX_ANNOTATIONS_PER_BATCH}`, async () => {
    const items = Array.from({ length: MAX_ANNOTATIONS_PER_BATCH + 1 }, () => makeItem())

    await expect(addAnnotations('doc-1', items)).rejects.toThrow(/at most/)
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('does not reject batches at the cap for batch size', async () => {
    transactionMock.mockImplementation(async (fn: (trx: unknown) => Promise<string[]>) =>
      fn(makeTrx()))
    const items = Array.from({ length: MAX_ANNOTATIONS_PER_BATCH }, () => makeItem())

    // The cap check must pass; any later failure should not be the batch-size error.
    await expect(addAnnotations('doc-1', items)).rejects.toThrow(/not iterable/)
    await expect(addAnnotations('doc-1', items)).rejects.not.toThrow(/at most/)
  })
})

function makeItem() {
  return {
    subject: makeComponent('subject'),
    subjectEntity: null,
    predicate: makeComponent('predicate'),
    predicateEntity: null,
    object: makeComponent('object'),
    objectEntity: null,
  }
}

function makeComponent(annotationTag: DocumentAnnotationComponent['annotationTag']): DocumentAnnotationComponent {
  return {
    id: `${annotationTag}-1`,
    entityLabel: null,
    entityValue: null,
    entityCustom: null,
    entityCustomId: null,
    entityDatatype: null,
    annotationStart: 0,
    annotationEnd: 1,
    annotationRow: null,
    annotationCell: null,
    annotationValue: annotationTag,
    annotationType: 'table',
    annotationTag,
    elementIndex: 0,
  }
}

function makeTrx() {
  const trx: Record<string, unknown> = {}
  const chain = () => {
    const step: Record<string, unknown> = {}
    const next = () => chain()
    step.select = vi.fn().mockReturnValue(next())
    step.from = vi.fn().mockReturnValue(next())
    step.where = vi.fn().mockReturnValue(next())
    step.insert = vi.fn().mockReturnValue(next())
    step.values = vi.fn().mockReturnValue(next())
    step.returning = vi.fn().mockReturnValue([{ id: 'a-1' }])
    step.update = vi.fn().mockReturnValue(next())
    step.set = vi.fn().mockReturnValue(next())
    return step
  }
  trx.select = vi.fn().mockReturnValue(chain())
  trx.insert = vi.fn().mockReturnValue(chain())
  trx.update = vi.fn().mockReturnValue(chain())
  return trx
}
