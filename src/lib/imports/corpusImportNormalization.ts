// Pure normalization helpers for full-corpus imports, split out of the
// 'use server' module so they stay unit-testable.

import type { UnitRef } from '@/types/types'
import { WIKIDATA_ITEM_PATTERN } from '@/lib/wikidata-constraints'

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isUnitRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeCustomEntityFields(
  data: Record<string, any>,
  customEntityIdMap: Record<string, string>,
) {
  const mappedCustomEntityId = typeof data.entityCustomId === 'string'
    ? customEntityIdMap[data.entityCustomId]
    : null

  if (isUuid(mappedCustomEntityId)) {
    data.entityCustomId = mappedCustomEntityId
    data.entityLabel = null
    data.entityValue = null
    data.entityDatatype = null
  } else {
    data.entityCustomId = null
    if (data.entityCustom === true) {
      data.entityCustom = false
    }
  }

  return data
}

export function takeImportedUnitRef(data: Record<string, any>): UnitRef | null {
  if (!isUnitRecord(data.unit)) {
    data.unit = null
    return null
  }
  const raw = data.unit
  data.unit = null
  return normalizeUnitRef(raw)
}

function normalizeUnitRef(raw: Record<string, unknown>): UnitRef | null {
  const label = typeof raw.label === 'string' ? raw.label : ''
  const wikidataId = typeof raw.wikidataId === 'string' && WIKIDATA_ITEM_PATTERN.test(raw.wikidataId)
    ? raw.wikidataId
    : null
  if (!wikidataId && !label) {
    return null
  }

  return {
    id: isUuid(raw.id) ? raw.id : null,
    label,
    wikidataId,
  }
}
