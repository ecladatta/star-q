'use server'
import type { AnnotationComponentRole, UnitRef } from '@/types/types'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, annotationQualifier, corpusCustomEntity, document } from '@/db/schema'
import { MAX_DOCUMENTS_PER_IMPORT } from '@/lib/constants'
import { ENTITY_DATATYPES, normalizeDatatype } from '@/lib/datatypes'
import { findOrCreateUnit, WIKIDATA_ID_PATTERN } from '@/lib/units/server'

import { isUuid, normalizeCustomEntityFields, takeImportedUnitRef } from './corpusImportNormalization'
import { isFullCorpusExport } from './fullCorpusExport'

const POSTGRES_INTEGER_MIN = -2_147_483_648
const POSTGRES_INTEGER_MAX = 2_147_483_647

function isComponentRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPostgresInteger(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isInteger(value)
    && Number.isSafeInteger(value)
    && value >= POSTGRES_INTEGER_MIN
    && value <= POSTGRES_INTEGER_MAX
  )
}

function getInvalidComponentFields(data: Record<string, any>) {
  const invalidFields: string[] = []

  if (!isPostgresInteger(data.annotationStart)) {
    invalidFields.push('annotationStart')
  }
  if (!isPostgresInteger(data.annotationEnd)) {
    invalidFields.push('annotationEnd')
  }
  if (typeof data.annotationValue !== 'string') {
    invalidFields.push('annotationValue')
  }
  if (data.annotationType !== 'text' && data.annotationType !== 'table') {
    invalidFields.push('annotationType')
  }
  if (typeof data.annotationTag !== 'string') {
    invalidFields.push('annotationTag')
  }
  if (!isPostgresInteger(data.elementIndex)) {
    invalidFields.push('elementIndex')
  }
  if (data.annotationRow !== null && data.annotationRow !== undefined && !isPostgresInteger(data.annotationRow)) {
    invalidFields.push('annotationRow')
  }
  if (data.annotationCell !== null && data.annotationCell !== undefined && !isPostgresInteger(data.annotationCell)) {
    invalidFields.push('annotationCell')
  }

  return invalidFields
}

function normalizeQualifierPosition(position: unknown, qualifierIndex: number): number {
  if (
    isPostgresInteger(position)
    && position >= 0
  ) {
    return position
  }

  return qualifierIndex <= POSTGRES_INTEGER_MAX ? qualifierIndex : POSTGRES_INTEGER_MAX
}

function normalizeDocumentOrder(order: unknown, fallbackOrder: number): number | null {
  if (order === null || order === undefined) {
    return isPostgresInteger(fallbackOrder) ? fallbackOrder : null
  }

  return isPostgresInteger(order) ? order : null
}

function normalizeDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function getInvalidCustomEntityFields(entity: Record<string, any>) {
  const invalidFields: string[] = []

  if (!isUuid(entity.id)) {
    invalidFields.push('id')
  }
  if (typeof entity.label !== 'string' || entity.label.length === 0) {
    invalidFields.push('label')
  }
  if (typeof entity.value !== 'string' || entity.value.length === 0) {
    invalidFields.push('value')
  }
  if (!ENTITY_DATATYPES.includes(entity.datatype) && !normalizeDatatype(entity.datatype)) {
    invalidFields.push('datatype')
  }
  if (entity.customType !== 'entity' && entity.customType !== 'relation') {
    invalidFields.push('customType')
  }
  if (entity.createdAt && !normalizeDate(entity.createdAt)) {
    invalidFields.push('createdAt')
  }
  if (entity.updatedAt && !normalizeDate(entity.updatedAt)) {
    invalidFields.push('updatedAt')
  }

  return invalidFields
}

function isDocumentData(value: unknown): boolean {
  if (!isComponentRecord(value) || !isComponentRecord(value._source)) {
    return false
  }

  const { identificationMetadata, extractionMetadata } = value._source
  if (!isComponentRecord(identificationMetadata)) {
    return false
  }
  if (typeof identificationMetadata.id !== 'string'
    || typeof identificationMetadata.versionDate !== 'string'
    || typeof identificationMetadata.hash !== 'string') {
    return false
  }

  return isComponentRecord(extractionMetadata)
    || (Array.isArray(extractionMetadata) && extractionMetadata.every(isComponentRecord))
}

/**
 * Import documents and annotations from a full corpus export
 */
export async function importFullCorpusExportDocuments(
  corpusId: string,
  corpusData: unknown,
): Promise<{ ids: string[], errors: string[], warnings: string[] }> {
  if (!isFullCorpusExport(corpusData)) {
    return {
      ids: [],
      errors: ['Not a STAR-Q corpus export. Expected exportMeta.type "full-corpus-export" and a documents array.'],
      warnings: [],
    }
  }

  const importedDocumentsIds: string[] = []
  const errors: string[] = []
  const warnings: string[] = []

  await db.transaction(async (tx) => {
    // Map old custom entity IDs to new database IDs
    const customEntityIdMap: Record<string, string> = {}
    const unitIdMap: Record<string, string> = {}

    if (Array.isArray(corpusData.units)) {
      for (const [index, entry] of corpusData.units.entries()) {
        if (!isComponentRecord(entry)) {
          warnings.push(`Skipping unit at index ${index}: row is not an object.`)
          continue
        }
        if (!isUuid(entry.id) || typeof entry.label !== 'string' || entry.label.length === 0) {
          warnings.push(`Skipping unit at index ${index}: invalid id or label.`)
          continue
        }

        const wikidataId = typeof entry.wikidataId === 'string' && WIKIDATA_ID_PATTERN.test(entry.wikidataId)
          ? entry.wikidataId
          : null
        unitIdMap[entry.id] = await findOrCreateUnit(tx, corpusId, { id: null, label: entry.label, wikidataId })
      }
    }

    // Batch insert valid custom entities and skip malformed rows before DB constraints.
    // Raw rows are handled untyped so each invalid field gets its own warning.
    const exportedCustomEntities = (corpusData.customEntities ?? []) as unknown as Array<Record<string, any>>
    if (exportedCustomEntities.length > 0) {
      const entitiesToInsert = exportedCustomEntities.flatMap((ent, index) => {
        if (!isComponentRecord(ent)) {
          warnings.push(`Skipping custom entity at index ${index}: row is not an object.`)
          return []
        }

        const invalidFields = getInvalidCustomEntityFields(ent)
        if (invalidFields.length > 0) {
          warnings.push(`Skipping custom entity at index ${index}: invalid field(s): ${invalidFields.join(', ')}.`)
          return []
        }

        const { id: oldId, ...data } = ent
        return {
          ...data,
          corpusId,
          datatype: normalizeDatatype(data.datatype) ?? data.datatype,
          createdAt: normalizeDate(data.createdAt),
          updatedAt: normalizeDate(data.updatedAt),
          _oldId: oldId,
        }
      })

      if (entitiesToInsert.length > 0) {
        const insertedEntities = await tx.insert(corpusCustomEntity)
          .values(entitiesToInsert.map(({ _oldId, ...data }) => data) as typeof corpusCustomEntity.$inferInsert[])
          .returning({ id: corpusCustomEntity.id })

        // Map old IDs to new IDs
        entitiesToInsert.forEach((ent, idx) => {
          customEntityIdMap[ent._oldId] = insertedEntities[idx].id
        })
      }
    }

    for (let i = 0; i < corpusData.documents.length; i++) {
      const doc = corpusData.documents[i]
      if (importedDocumentsIds.length >= MAX_DOCUMENTS_PER_IMPORT) {
        warnings.push(`Import stopped at ${MAX_DOCUMENTS_PER_IMPORT} documents.`)
        break
      }
      try {
        if (!isDocumentData(doc.raw)) {
          errors.push(`Error inserting document ${doc.title}: raw document data is missing or invalid.`)
          continue
        }

        const documentOrder = normalizeDocumentOrder((doc as any).order, i + 1)
        if (documentOrder === null) {
          errors.push(`Error inserting document ${doc.title}: document order is missing or invalid.`)
          continue
        }

        // Insert document with content
        const baseCreatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date()

        const [documentId] = await tx.insert(document).values({
          corpusId,
          title: doc.title,
          raw: doc.raw,
          createdAt: baseCreatedAt,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
          completedAt: doc.completedAt ? new Date(doc.completedAt) : null,
          order: documentOrder,
        }).returning({ id: document.id })

        // Insert annotations for this document
        if (doc.annotations && doc.annotations.length > 0) {
          for (const ann of doc.annotations) {
            try {
              // Remap a component's unit reference to the imported unit row:
              // the id map covers references into the export's units, identity
              // lookup handles dangling ones.
              const resolveImportedUnitId = async (unitRef: UnitRef | null): Promise<string | null> => {
                if (!unitRef) {
                  return null
                }
                const mapped = unitRef.id ? unitIdMap[unitRef.id] : undefined
                if (mapped) {
                  return mapped
                }
                if (!unitRef.wikidataId && !unitRef.label) {
                  return null
                }
                return findOrCreateUnit(tx, corpusId, {
                  id: null,
                  label: unitRef.label || unitRef.wikidataId || '',
                  wikidataId: unitRef.wikidataId,
                })
              }

              const prepareComponentData = async (
                comp: unknown,
                key: string,
                issues: string[],
                annotationTag?: AnnotationComponentRole,
              ) => {
                if (!isComponentRecord(comp)) {
                  issues.push(`Annotation component '${key}' is not an object: ${JSON.stringify(comp)} in document ${doc.title}`)
                  return null
                }

                const { id: _id, ...data } = comp
                if (annotationTag) {
                  data.annotationTag = annotationTag
                }
                const invalidFields = getInvalidComponentFields(data)
                if (invalidFields.length > 0) {
                  issues.push(`Annotation component '${key}' has invalid required field(s): ${invalidFields.join(', ')} in document ${doc.title}`)
                  return null
                }

                const normalized = normalizeCustomEntityFields(data, customEntityIdMap)
                const unitId = await resolveImportedUnitId(takeImportedUnitRef(normalized))
                return { ...normalized, unitId } as typeof annotationComponent.$inferInsert
              }

              const insertPreparedComponent = async (data: typeof annotationComponent.$inferInsert) => {
                const [insertedComp] = await tx.insert(annotationComponent)
                  .values(data)
                  .returning({ id: annotationComponent.id })

                return insertedComp.id
              }

              const baseComponentData = await Promise.all((['subject', 'predicate', 'object'] as const).map(key => prepareComponentData(ann[key], key, errors)))
              if (baseComponentData.includes(null)) {
                errors.push(`Skipping annotation in document ${doc.title} due to invalid component.`)
                continue
              }
              const [subjectData, predicateData, objectData] = baseComponentData as [
                typeof annotationComponent.$inferInsert,
                typeof annotationComponent.$inferInsert,
                typeof annotationComponent.$inferInsert,
              ]

              // Insert annotation components (subject, predicate, object)
              const [subjectId, predicateId, objectId] = await Promise.all([
                insertPreparedComponent(subjectData),
                insertPreparedComponent(predicateData),
                insertPreparedComponent(objectData),
              ])

              // Insert annotation record
              const [insertedAnnotation] = await tx.insert(annotation).values({
                documentId: documentId.id,
                subjectId,
                predicateId,
                objectId,
              }).returning({ id: annotation.id })

              const qualifiers = Array.isArray((ann as any).qualifiers) ? (ann as any).qualifiers : []
              for (const [qualifierIndex, qualifier] of qualifiers.entries()) {
                try {
                  if (!isComponentRecord(qualifier)) {
                    warnings.push(`Annotation qualifier at index ${qualifierIndex} is not an object: ${JSON.stringify(qualifier)} in document ${doc.title}`)
                    continue
                  }

                  const qualifierPosition = normalizeQualifierPosition(qualifier.position, qualifierIndex)
                  const qualifierPredicateData = await prepareComponentData(
                    qualifier.predicate,
                    `qualifier[${qualifierIndex}].predicate`,
                    warnings,
                    'qualifier-predicate',
                  )
                  const qualifierValueData = await prepareComponentData(
                    qualifier.value,
                    `qualifier[${qualifierIndex}].value`,
                    warnings,
                    'qualifier-value',
                  )
                  if (!qualifierPredicateData || !qualifierValueData) {
                    warnings.push(`Skipping annotation qualifier at index ${qualifierIndex} in document ${doc.title} due to invalid component.`)
                    continue
                  }

                  await tx.transaction(async (qualifierTx) => {
                    const [insertedPredicate] = await qualifierTx.insert(annotationComponent)
                      .values(qualifierPredicateData)
                      .returning({ id: annotationComponent.id })
                    const [insertedValue] = await qualifierTx.insert(annotationComponent)
                      .values(qualifierValueData)
                      .returning({ id: annotationComponent.id })

                    await qualifierTx.insert(annotationQualifier).values({
                      annotationId: insertedAnnotation.id,
                      predicateId: insertedPredicate.id,
                      valueId: insertedValue.id,
                      position: qualifierPosition,
                    })
                  })
                } catch (qualifierErr) {
                  warnings.push(`Error inserting annotation qualifier at index ${qualifierIndex} in document ${doc.title}: ${qualifierErr}`)
                  continue
                }
              }
            } catch (annErr) {
              errors.push(`Error inserting annotation in document ${doc.title}: ${annErr}`)
              continue
            }
          }
        }

        importedDocumentsIds.push(documentId.id)
      } catch (docErr) {
        errors.push(`Error inserting document ${doc.title}: ${docErr}`)
        continue
      }
    }
  })

  if (errors.length > 0) {
    console.warn('Import errors:', errors)
  }
  if (warnings.length > 0) {
    console.warn('Import warnings:', warnings)
  }

  return { ids: importedDocumentsIds, errors, warnings }
}
