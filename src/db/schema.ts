import type { DocumentData, EntityDatatype } from '@/app/corpus/[corpusId]/corpus-view'
import type { InferSelectModel } from 'drizzle-orm'
import type { AdapterAccountType } from 'next-auth/adapters'
import { randomUUID } from 'node:crypto'
import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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
  entityDatatype: text('entity_datatype').$type<EntityDatatype>(),
  annotationStart: integer('annotation_start').notNull(),
  annotationEnd: integer('annotation_end').notNull(),
  annotationRow: integer('annotation_row'),
  annotationCell: integer('annotation_cell'),
  annotationValue: text('annotation_value').notNull(),
  annotationType: text('annotation_type').$type<'text' | 'table'>().notNull(),
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
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
export type Annotation = InferSelectModel<typeof annotation>
