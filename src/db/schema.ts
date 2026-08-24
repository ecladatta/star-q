import type { InferSelectModel } from 'drizzle-orm'
import type { AdapterAccountType } from 'next-auth/adapters'
import type { CorpusSettings } from '@/lib/corpus-settings'
import type { AnnotationComponentRole, DocumentData, EntityDatatype } from '@/types/types'
import { randomUUID } from 'node:crypto'
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
})

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  account => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ],
)

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  verificationToken => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ],
)

export const authenticators = pgTable(
  'authenticator',
  {
    credentialID: text('credentialID').notNull().unique(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('providerAccountId').notNull(),
    credentialPublicKey: text('credentialPublicKey').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credentialDeviceType').notNull(),
    credentialBackedUp: boolean('credentialBackedUp').notNull(),
    transports: text('transports'),
  },
  authenticator => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ],
)

export const corpus = pgTable('corpus', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  title: text('title'),
  settings: jsonb('settings').$type<CorpusSettings>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
export type Corpus = InferSelectModel<typeof corpus>

export const corpusCustomEntity = pgTable('corpus_custom_entity', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  corpusId: uuid('corpus_id').references(() => corpus.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  datatype: text('datatype').$type<EntityDatatype>().notNull().default('string'),
  customType: text('custom_type').$type<'entity' | 'relation'>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
export type CorpusCustomEntity = InferSelectModel<typeof corpusCustomEntity>

export const document = pgTable('document', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  corpusId: uuid('corpus_id').references(() => corpus.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  raw: jsonb('raw').$type<DocumentData>().notNull(),
  completedAt: timestamp('completed_at'),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
export type Document = InferSelectModel<typeof document>

export const annotationComponent = pgTable('annotation_component', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  entityLabel: text('entity_label'),
  entityValue: text('entity_value'),
  entityCustom: boolean('entity_custom'),
  entityCustomId: uuid('entity_custom_id').references(() => corpusCustomEntity.id, { onDelete: 'set null' }),
  entityDatatype: text('entity_datatype').$type<EntityDatatype>(),
  annotationStart: integer('annotation_start').notNull(),
  annotationEnd: integer('annotation_end').notNull(),
  annotationRow: integer('annotation_row'),
  annotationCell: integer('annotation_cell'),
  annotationValue: text('annotation_value').notNull(),
  annotationType: text('annotation_type').$type<'text' | 'table'>().notNull(),
  annotationTag: text('annotation_tag').$type<AnnotationComponentRole>().notNull(),
  elementIndex: integer('element_index').notNull(),
})
export type AnnotationComponent = InferSelectModel<typeof annotationComponent>

export const annotation = pgTable('annotation', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').references(() => document.id, { onDelete: 'cascade' }).notNull(),
  subjectId: uuid('subject_id').references(() => annotationComponent.id, { onDelete: 'cascade' }).notNull(),
  predicateId: uuid('predicate_id').references(() => annotationComponent.id, { onDelete: 'cascade' }).notNull(),
  objectId: uuid('object_id').references(() => annotationComponent.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
export type Annotation = InferSelectModel<typeof annotation>

export const annotationQualifier = pgTable(
  'annotation_qualifier',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    annotationId: uuid('annotation_id').references(() => annotation.id, { onDelete: 'cascade' }).notNull(),
    predicateId: uuid('predicate_id').references(() => annotationComponent.id, { onDelete: 'cascade' }).notNull(),
    valueId: uuid('value_id').references(() => annotationComponent.id, { onDelete: 'cascade' }).notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('annotation_qualifier_annotation_position_idx').on(table.annotationId, table.position),
  ],
)
export type AnnotationQualifier = InferSelectModel<typeof annotationQualifier>
