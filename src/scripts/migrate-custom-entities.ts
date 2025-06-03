/**
 * Migration script to fix custom entities where entityCustom is true but entityCustomId is null.
 * This creates proper custom entities in the corpus_custom_entity table and updates references.
 */

import cliProgress from 'cli-progress'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { annotationComponent, annotation as annotationTable, corpusCustomEntity, document } from '@/db/schema'

async function migrateCustomEntities() {
  console.log('Starting custom entity migration...')

  // Find all annotation components with entityCustom = true but no entityCustomId
  const componentsToFix = await db.select()
    .from(annotationComponent)
    .where(
      and(
        eq(annotationComponent.entityCustom, true),
        isNull(annotationComponent.entityCustomId),
      ),
    )

  console.log(`Found ${componentsToFix.length} components with missing custom entity references`)

  if (componentsToFix.length === 0) {
    console.log('No components need migration. Exiting.')
    return
  }

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  progressBar.start(componentsToFix.length, 0)

  for (const [index, component] of componentsToFix.entries()) {
    progressBar.update(index + 1)

    // For each component, we need to find its corpusId through its annotation
    // Find which annotation uses this component
    let annotationRecord = null

    // Check if the component is used as subject, predicate, or object
    const asSubject = await db.select()
      .from(annotationTable)
      .where(eq(annotationTable.subjectId, component.id))
      .limit(1)

    const asPredicate = asSubject.length === 0
      ? await db.select()
          .from(annotationTable)
          .where(eq(annotationTable.predicateId, component.id))
          .limit(1)
      : []

    const asObject = asSubject.length === 0 && asPredicate.length === 0
      ? await db.select()
          .from(annotationTable)
          .where(eq(annotationTable.objectId, component.id))
          .limit(1)
      : []

    // Determine which role this component plays and map to customType
    let customType: 'entity' | 'relation'

    if (asSubject.length > 0) {
      annotationRecord = asSubject[0]
      customType = 'entity' // subjects are entities
    } else if (asPredicate.length > 0) {
      annotationRecord = asPredicate[0]
      customType = 'relation' // predicates are relations
    } else if (asObject.length > 0) {
      annotationRecord = asObject[0]
      customType = 'entity' // objects are entities
    } else {
      continue
    }

    // Get the corpus ID from the document
    const [doc] = await db.select({ corpusId: document.corpusId })
      .from(document)
      .where(eq(document.id, annotationRecord.documentId))
      .limit(1)

    if (!doc) {
      console.log(`Warning: Document not found for annotation ${annotationRecord.id}. Skipping component ${component.id}.`)
      continue
    }

    if (!component.entityLabel || !component.entityValue) {
      console.log(`Warning: Component ${component.id} has no entity label or value. Skipping.`)
      continue
    }

    console.log(`Processing component ${component.id} from corpus ${doc.corpusId} as ${customType}`)

    // Check if a custom entity with the same value and type already exists in this corpus
    const [existingEntity] = await db.select()
      .from(corpusCustomEntity)
      .where(
        and(
          eq(corpusCustomEntity.corpusId, doc.corpusId),
          eq(corpusCustomEntity.value, component.entityValue),
          eq(corpusCustomEntity.customType, customType),
        ),
      )
      .limit(1)

    let entityId: string

    if (existingEntity) {
      // Use the existing custom entity
      entityId = existingEntity.id
      console.log(`Using existing custom entity ${entityId}`)
    } else {
      // Create a new custom entity
      const [newEntity] = await db.insert(corpusCustomEntity)
        .values({
          corpusId: doc.corpusId,
          label: component.entityLabel,
          value: component.entityValue,
          datatype: component.entityDatatype || 'string',
          customType,
        })
        .returning()

      entityId = newEntity.id
      console.log(`Created new custom entity ${entityId}`)
    }

    // Update the component with the custom entity ID
    await db.update(annotationComponent)
      .set({ entityCustomId: entityId })
      .where(eq(annotationComponent.id, component.id))

    console.log(`Updated component ${component.id} with entityCustomId ${entityId}`)
  }

  console.log('Migration completed successfully.')
}

// Run the migration
migrateCustomEntities()
  .then(() => {
    console.log('Custom entity migration finished.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error during migration:', error)
    process.exit(1)
  })
