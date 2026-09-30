import type { UnitRef } from '@/types/types'
import { describe, expect, it } from 'vitest'
import { normalizeCustomEntityFields, takeImportedUnitRef } from './corpusImportNormalization'

const OLD_CUSTOM_ID = '11111111-1111-4111-8111-111111111111'
const NEW_CUSTOM_ID = '22222222-2222-4222-8222-222222222222'
const OLD_UNIT_ID = '33333333-3333-4333-8333-333333333333'

const idMap = {
  [OLD_CUSTOM_ID]: NEW_CUSTOM_ID,
}

describe('normalizeCustomEntityFields', () => {
  it('imports an export without custom entity references unchanged', () => {
    const data = {
      entityCustom: false,
      entityCustomId: null,
      entityLabel: null,
      entityValue: '12',
      entityDatatype: 'decimal',
      annotationValue: '12 metres',
    }

    const result = normalizeCustomEntityFields(data, idMap)
    expect(result.entityValue).toBe('12')
    expect(result.entityDatatype).toBe('decimal')
    expect(result.entityCustomId).toBeNull()
  })

  it('remaps a custom entity id and defers label and value to read time', () => {
    const data = {
      entityCustom: true,
      entityCustomId: OLD_CUSTOM_ID,
      entityLabel: 'label',
      entityValue: 'value',
      entityDatatype: 'string',
    }

    const result = normalizeCustomEntityFields(data, idMap)
    expect(result.entityCustomId).toBe(NEW_CUSTOM_ID)
    expect(result.entityValue).toBeNull()
    expect(result.entityLabel).toBeNull()
  })

  it('degrades an unresolvable custom entity reference to no entity', () => {
    const data = {
      entityCustom: true,
      entityCustomId: '55555555-5555-4555-8555-555555555555',
      entityLabel: 'label',
      entityValue: 'value',
      entityDatatype: 'string',
    }

    const result = normalizeCustomEntityFields(data, idMap)
    expect(result.entityCustomId).toBeNull()
    expect(result.entityCustom).toBe(false)
  })
})

describe('takeImportedUnitRef', () => {
  function extract(data: Record<string, any>): { ref: UnitRef | null, data: Record<string, any> } {
    const clone = { ...data }
    const ref = takeImportedUnitRef(clone)
    return { ref, data: clone }
  }

  it('accepts a component with a unit ref', () => {
    const { ref, data } = extract({
      entityValue: '12',
      entityDatatype: 'decimal',
      unit: { id: OLD_UNIT_ID, label: 'metre', wikidataId: 'Q11573' },
    })
    expect(ref).toEqual({ id: OLD_UNIT_ID, label: 'metre', wikidataId: 'Q11573' })
    expect(data.unit).toBeNull()
  })

  it('drops a unit ref without label or wikidata id', () => {
    const { ref } = extract({ unit: { id: OLD_UNIT_ID, label: '', wikidataId: null } })
    expect(ref).toBeNull()
  })

  it('drops a component without any unit field', () => {
    const { ref } = extract({ entityValue: '12', entityDatatype: 'decimal' })
    expect(ref).toBeNull()
  })
})
