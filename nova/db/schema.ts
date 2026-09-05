import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const projects = sqliteTable('projects', {
    id: text('id').primaryKey(), owner: text('owner').notNull(), title: text('title').notNull(), kind: text('kind').notNull(), description: text('description').notNull().default(''), goal: integer('goal').notNull().default(50000), style: text('style').notNull().default(''), sample: text('sample').notNull().default(''), archived: integer('archived').notNull().default(0), created: text('created').notNull(), updated: text('updated').notNull(),
}, t => [index('projects_owner_updated').on(t.owner, t.updated)]);
export const chapters = sqliteTable('chapters', {
    id: text('id').primaryKey(), project: text('project').notNull().references(() => projects.id, { onDelete: 'cascade' }), title: text('title').notNull(), content: text('content').notNull().default(''), position: integer('position').notNull(), version: integer('version').notNull().default(1), words: integer('words').notNull().default(0), updated: text('updated').notNull(),
}, t => [index('chapters_project_position').on(t.project, t.position)]);
export const revisions = sqliteTable('revisions', {
    id: text('id').primaryKey(), chapter: text('chapter').notNull().references(() => chapters.id, { onDelete: 'cascade' }), title: text('title').notNull(), content: text('content').notNull(), version: integer('version').notNull(), words: integer('words').notNull(), created: text('created').notNull(),
}, t => [uniqueIndex('revisions_chapter_version').on(t.chapter, t.version)]);
export const sources = sqliteTable('sources', {
    id: text('id').primaryKey(), project: text('project').notNull().references(() => projects.id, { onDelete: 'cascade' }), title: text('title').notNull(), author: text('author').notNull().default(''), url: text('url').notNull().default(''), object_key: text('object_key').notNull(), filename: text('filename').notNull(), bytes: integer('bytes').notNull(), created: text('created').notNull(),
}, t => [index('sources_project').on(t.project)]);
export const chunks = sqliteTable('chunks', {
    id: text('id').primaryKey(), source: text('source').notNull().references(() => sources.id, { onDelete: 'cascade' }), position: integer('position').notNull(), content: text('content').notNull(), search: text('search').notNull(),
}, t => [index('chunks_source_position').on(t.source, t.position)]);
export const memories = sqliteTable('memories', {
    id: text('id').primaryKey(), project: text('project').notNull().references(() => projects.id, { onDelete: 'cascade' }), kind: text('kind').notNull(), title: text('title').notNull(), content: text('content').notNull(), date: text('date').notNull().default(''), updated: text('updated').notNull(),
}, t => [index('memories_project').on(t.project)]);
