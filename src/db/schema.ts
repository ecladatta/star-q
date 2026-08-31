import type { InferSelectModel } from 'drizzle-orm'
import type { AdapterAccountType } from 'next-auth/adapters'
import type { CorpusSettings } from '@/lib/corpus-settings'
import type { AnnotationComponentRole, DocumentData, EntityDatatype } from '@/types/types'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const userRoleValues = ['user', 'admin'] as const
export type UserRole = (typeof userRoleValues)[number]

export const userStatusValues = ['active', 'blocked'] as const
export type UserStatus = (typeof userStatusValues)[number]

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  username: text('username').unique(),
  role: text('role').$type<UserRole>().notNull().default('user'),
  status: text('status').$type<UserStatus>().notNull().default('active'),
  passwordHash: text('password_hash'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  sessionVersion: integer('session_version').notNull().default(0),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { mode: 'date' }),
  blockedAt: timestamp('blocked_at', { mode: 'date' }),
  blockedByUserId: text('blocked_by_user_id'),
  lastSignedInAt: timestamp('last_signed_in_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
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

export const appSettings = pgTable('app_settings', {
  id: text('id').primaryKey().default('default'),
  setupCompletedAt: timestamp('setup_completed_at', { mode: 'date' }),
  signupEnabled: boolean('signup_enabled').notNull().default(true),
  signinEnabled: boolean('signin_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
})

export const teamRoleValues = ['owner', 'member'] as const
export type TeamRole = (typeof teamRoleValues)[number]

export const invitationStatusValues = ['pending', 'accepted', 'declined', 'revoked'] as const
export type InvitationStatus = (typeof invitationStatusValues)[number]

export const team = pgTable('team', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
})
export type Team = InferSelectModel<typeof team>

export const teamMembership = pgTable(
  'team_membership',
  {
    teamId: uuid('team_id').references(() => team.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    role: text('role').$type<TeamRole>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  membership => [primaryKey({ columns: [membership.teamId, membership.userId] })],
)

export const teamInvitation = pgTable(
  'team_invitation',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    teamId: uuid('team_id').references(() => team.id, { onDelete: 'cascade' }).notNull(),
    inviteeUserId: text('invitee_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    invitedByUserId: text('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    role: text('role').$type<TeamRole>().notNull(),
    status: text('status').$type<InvitationStatus>().notNull().default('pending'),
    respondedAt: timestamp('responded_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  invitation => [uniqueIndex('team_invitation_team_invitee_idx').on(invitation.teamId, invitation.inviteeUserId)],
)

export const corpusVisibilityValues = ['private', 'public'] as const
export type CorpusVisibility = (typeof corpusVisibilityValues)[number]

export const corpusOwnerTypeValues = ['bootstrap', 'user', 'team'] as const
export type CorpusOwnerType = (typeof corpusOwnerTypeValues)[number]

export const corpus = pgTable(
  'corpus',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    title: text('title'),
    visibility: text('visibility').$type<CorpusVisibility>().notNull().default('private'),
    ownerType: text('owner_type').$type<CorpusOwnerType>().notNull().default('bootstrap'),
    ownerUserId: text('owner_user_id').references(() => users.id, { onDelete: 'cascade' }),
    ownerTeamId: uuid('owner_team_id').references(() => team.id, { onDelete: 'cascade' }),
    settings: jsonb('settings').$type<CorpusSettings>().notNull().default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('corpus_owner_user_idx').on(table.ownerUserId),
    index('corpus_owner_team_idx').on(table.ownerTeamId),
    check(
      'corpus_owner_check',
      sql`(${table.ownerType} = 'bootstrap' AND ${table.ownerUserId} IS NULL AND ${table.ownerTeamId} IS NULL)
        OR (${table.ownerType} = 'user' AND ${table.ownerUserId} IS NOT NULL AND ${table.ownerTeamId} IS NULL)
        OR (${table.ownerType} = 'team' AND ${table.ownerUserId} IS NULL AND ${table.ownerTeamId} IS NOT NULL)`,
    ),
  ],
)
export type Corpus = InferSelectModel<typeof corpus>

export const corpusCollaboratorRoleValues = ['viewer', 'editor'] as const
export type CorpusCollaboratorRole = (typeof corpusCollaboratorRoleValues)[number]

export const corpusCollaboration = pgTable(
  'corpus_collaboration',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    corpusId: uuid('corpus_id').references(() => corpus.id, { onDelete: 'cascade' }).notNull(),
    targetUserId: text('target_user_id').references(() => users.id, { onDelete: 'cascade' }),
    targetTeamId: uuid('target_team_id').references(() => team.id, { onDelete: 'cascade' }),
    role: text('role').$type<CorpusCollaboratorRole>().notNull(),
    status: text('status').$type<InvitationStatus>().notNull().default('pending'),
    invitedByUserId: text('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    respondedByUserId: text('responded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    respondedAt: timestamp('responded_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('corpus_collaboration_user_idx').on(table.corpusId, table.targetUserId),
    uniqueIndex('corpus_collaboration_team_idx').on(table.corpusId, table.targetTeamId),
    check(
      'corpus_collaboration_target_check',
      sql`num_nonnulls(${table.targetUserId}, ${table.targetTeamId}) = 1`,
    ),
  ],
)

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  table => [index('audit_log_created_at_idx').on(table.createdAt)],
)

export const apiKey = pgTable(
  'api_key',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  table => [uniqueIndex('api_key_hash_idx').on(table.keyHash)],
)
export type ApiKey = InferSelectModel<typeof apiKey>

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
