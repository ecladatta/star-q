import type { DocumentData } from '@/app/corpus/[corpusId]/corpus-view'
import type { InferSelectModel } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const corpus = pgTable('corpus', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  title: text('title'),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
export type Corpus = InferSelectModel<typeof corpus>

export const document = pgTable('document', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  corpusId: uuid('corpus_id').references(() => corpus.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull().$type<'text/x-wiki' | 'text/plain'>(),
  title: text('title').notNull(),
  raw: jsonb('raw').$type<DocumentData>().notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
export type Document = InferSelectModel<typeof document>

export const annotationComponent = pgTable('annotation_component', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  entityLabel: text('entity_label'),
  entityValue: text('entity_value'),
  entityCustom: boolean('entity_custom'),
  annotationStart: integer('annotation_start').notNull(),
  annotationEnd: integer('annotation_end').notNull(),
  annotationRow: integer('annotation_row'),
  annotationCell: integer('annotation_cell'),
  annotationValue: text('annotation_value').notNull(),
  annotationType: text('annotation_type').notNull(),
  annotationTag: text('annotation_tag').notNull(),
  elementIndex: integer('element_index').notNull(),
})
export type AnnotationComponent = InferSelectModel<typeof annotationComponent>

export const annotation = pgTable('annotation', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').references(() => document.id, { onDelete: 'cascade' }).notNull(),
  subjectId: uuid('subject_id').references(() => annotationComponent.id).notNull(),
  predicateId: uuid('predicate_id').references(() => annotationComponent.id).notNull(),
  objectId: uuid('object_id').references(() => annotationComponent.id).notNull(),
})
export type Annotation = InferSelectModel<typeof annotation>
