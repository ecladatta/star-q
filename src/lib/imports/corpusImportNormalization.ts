// Pure normalization helpers for full-corpus imports, split out of the
// 'use server' module so they stay unit-testable.

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
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

  normalizeCustomUnitFields(data, customEntityIdMap)
  return data
}

export function normalizeCustomUnitFields(
  data: Record<string, any>,
  customEntityIdMap: Record<string, string>,
) {
  const mappedUnitCustomId = typeof data.unitCustomId === 'string'
    ? customEntityIdMap[data.unitCustomId]
    : null

  if (isUuid(mappedUnitCustomId)) {
    data.unitCustomId = mappedUnitCustomId
    data.unitLabel = null
    data.unitValue = null
    return
  }

  data.unitCustomId = null
  if (data.unitCustom === true) {
    data.unitCustom = false
  }
}
