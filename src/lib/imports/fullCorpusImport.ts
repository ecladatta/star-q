'use server'
import type { DocumentData, ExportModel } from '@/types/types'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, annotationQualifier, corpusCustomEntity, document } from '@/db/schema'

function isComponentRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null
}

function remapCustomEntityId(
  data: Record<string, any>,
  customEntityIdMap: Record<string, string>,
) {
  if (data.entityCustomId && customEntityIdMap[data.entityCustomId]) {
    data.entityCustomId = customEntityIdMap[data.entityCustomId]
    data.entityLabel = null
    data.entityValue = null
    data.entityDatatype = null
  }
  return data
}

function getInvalidComponentFields(data: Record<string, any>) {
  const invalidFields: string[] = []

  if (!Number.isInteger(data.annotationStart)) {
    invalidFields.push('annotationStart')
  }
  if (!Number.isInteger(data.annotationEnd)) {
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
  if (!Number.isInteger(data.elementIndex)) {
    invalidFields.push('elementIndex')
  }
  if (data.annotationRow !== null && data.annotationRow !== undefined && !Number.isInteger(data.annotationRow)) {
    invalidFields.push('annotationRow')
  }
  if (data.annotationCell !== null && data.annotationCell !== undefined && !Number.isInteger(data.annotationCell)) {
    invalidFields.push('annotationCell')
  }

  return invalidFields
}

/**
 * Import documents and annotations from a full corpus export
 */
export async function importFullCorpusExportDocuments(
  corpusId: string,
  corpusData: ExportModel,
): Promise<{ ids: string[], errors: string[] }> {
  const importedDocumentsIds: string[] = []
  const errors: string[] = []

  await db.transaction(async (tx) => {
    // Map old custom entity IDs to new database IDs
    const customEntityIdMap: Record<string, string> = {}

    // Batch insert custom entities
    if (corpusData.customEntities && corpusData.customEntities.length > 0) {
      const entitiesToInsert = corpusData.customEntities.map((ent) => {
        const { id: oldId, ...data } = ent
        return {
          ...data,
          corpusId,
          createdAt: data.createdAt ? new Date(data.createdAt) : null,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
          _oldId: oldId,
        }
      })

      const insertedEntities = await tx.insert(corpusCustomEntity)
        .values(entitiesToInsert.map(({ _oldId, ...data }) => data))
        .returning({ id: corpusCustomEntity.id })

      // Map old IDs to new IDs
      entitiesToInsert.forEach((ent, idx) => {
        customEntityIdMap[ent._oldId] = insertedEntities[idx].id
      })
    }

    for (let i = 0; i < corpusData.documents.length; i++) {
      const doc = corpusData.documents[i]
      try {
        // Insert document with content
        const baseCreatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date()

        const [documentId] = await tx.insert(document).values({
          corpusId,
          title: doc.title,
          raw: doc.raw as DocumentData,
          createdAt: baseCreatedAt,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
          completedAt: doc.completedAt ? new Date(doc.completedAt) : null,
          order: doc.order ?? (i + 1),
        }).returning({ id: document.id })

        // Insert annotations for this document
        if (doc.annotations && doc.annotations.length > 0) {
          for (const ann of doc.annotations) {
            try {
              const prepareComponentData = (comp: unknown, key: string) => {
                if (!isComponentRecord(comp)) {
                  errors.push(`Annotation component '${key}' is not an object: ${JSON.stringify(comp)} in document ${doc.title}`)
                  return null
                }

                const { id: _id, ...data } = comp
                const invalidFields = getInvalidComponentFields(data)
                if (invalidFields.length > 0) {
                  errors.push(`Annotation component '${key}' has invalid required field(s): ${invalidFields.join(', ')} in document ${doc.title}`)
                  return null
                }

                return remapCustomEntityId(data, customEntityIdMap) as typeof annotationComponent.$inferInsert
              }

              const insertPreparedComponent = async (data: typeof annotationComponent.$inferInsert) => {
                const [insertedComp] = await tx.insert(annotationComponent)
                  .values(data)
                  .returning({ id: annotationComponent.id })

                return insertedComp.id
              }

              const baseComponentData = (['subject', 'predicate', 'object'] as const).map(key => prepareComponentData(ann[key], key))
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
                    errors.push(`Annotation qualifier at index ${qualifierIndex} is not an object: ${JSON.stringify(qualifier)} in document ${doc.title}`)
                    continue
                  }

                  const qualifierPredicateData = prepareComponentData(qualifier.predicate, `qualifier[${qualifierIndex}].predicate`)
                  const qualifierValueData = prepareComponentData(qualifier.value, `qualifier[${qualifierIndex}].value`)
                  if (!qualifierPredicateData || !qualifierValueData) {
                    errors.push(`Skipping annotation qualifier at index ${qualifierIndex} in document ${doc.title} due to invalid component.`)
                    continue
                  }

                  const qualifierPredicateId = await insertPreparedComponent(qualifierPredicateData)
                  const qualifierValueId = await insertPreparedComponent(qualifierValueData)

                  await tx.insert(annotationQualifier).values({
                    annotationId: insertedAnnotation.id,
                    predicateId: qualifierPredicateId,
                    valueId: qualifierValueId,
                    position: typeof qualifier.position === 'number' ? qualifier.position : qualifierIndex,
                  })
                } catch (qualifierErr) {
                  errors.push(`Error inserting annotation qualifier at index ${qualifierIndex} in document ${doc.title}: ${qualifierErr}`)
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

  return { ids: importedDocumentsIds, errors }
}
