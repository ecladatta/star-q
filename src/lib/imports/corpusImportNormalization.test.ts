import { describe, expect, it } from 'vitest'
import { normalizeCustomEntityFields } from './corpusImportNormalization'

const OLD_CUSTOM_ID = '11111111-1111-4111-8111-111111111111'
const NEW_CUSTOM_ID = '22222222-2222-4222-8222-222222222222'
const OLD_UNIT_ID = '33333333-3333-4333-8333-333333333333'
const NEW_UNIT_ID = '44444444-4444-4444-8444-444444444444'

const idMap = {
  [OLD_CUSTOM_ID]: NEW_CUSTOM_ID,
  [OLD_UNIT_ID]: NEW_UNIT_ID,
}

describe('normalizeCustomEntityFields', () => {
  it('imports an export without unit fields unchanged, with no unit reference', () => {
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
    // The unit fields are absent in pre-feature exports and stay absent; the
    // nullable columns default to null on insert.
    expect(result.unitValue).toBeUndefined()
    expect(result.unitLabel).toBeUndefined()
    expect(result.unitCustom).toBeUndefined()
    expect(result.unitCustomId).toBeNull()
  })

  it('keeps a wikidata unit through normalization', () => {
    const data = {
      entityCustom: false,
      entityValue: '12',
      entityDatatype: 'decimal',
      unitValue: 'Q11573',
      unitLabel: 'metre',
      unitCustom: false,
      unitCustomId: null,
    }

    const result = normalizeCustomEntityFields(data, idMap)
    expect(result.unitValue).toBe('Q11573')
    expect(result.unitLabel).toBe('metre')
    expect(result.unitCustom).toBe(false)
    expect(result.unitCustomId).toBeNull()
  })

  it('remaps a custom unit id and defers label and value to read time', () => {
    const data = {
      entityCustom: false,
      entityValue: '12',
      entityDatatype: 'decimal',
      unitValue: 'bottle',
      unitLabel: 'bottle',
      unitCustom: true,
      unitCustomId: OLD_UNIT_ID,
    }

    const result = normalizeCustomEntityFields(data, idMap)
    expect(result.unitCustomId).toBe(NEW_UNIT_ID)
    expect(result.unitValue).toBeNull()
    expect(result.unitLabel).toBeNull()
    expect(result.unitCustom).toBe(true)
  })

  it('degrades an unresolvable custom unit reference to no unit', () => {
    const data = {
      entityCustom: false,
      entityValue: '12',
      entityDatatype: 'decimal',
      unitValue: 'bottle',
      unitLabel: 'bottle',
      unitCustom: true,
      unitCustomId: '55555555-5555-4555-8555-555555555555',
    }

    const result = normalizeCustomEntityFields(data, idMap)
    expect(result.unitCustomId).toBeNull()
    expect(result.unitCustom).toBe(false)
  })

  it('still resolves custom entity references alongside units', () => {
    const data = {
      entityCustom: true,
      entityCustomId: OLD_CUSTOM_ID,
      entityLabel: 'label',
      entityValue: 'value',
      entityDatatype: 'string',
      unitValue: 'Q11573',
      unitLabel: 'metre',
      unitCustom: false,
      unitCustomId: null,
    }

    const result = normalizeCustomEntityFields(data, idMap)
    expect(result.entityCustomId).toBe(NEW_CUSTOM_ID)
    expect(result.entityValue).toBeNull()
    expect(result.unitValue).toBe('Q11573')
    expect(result.unitLabel).toBe('metre')
  })
})
