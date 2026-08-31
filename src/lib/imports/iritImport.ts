'use server'
import type { DocumentAnnotationComponent, DocumentData } from '@/types/types'
import { Buffer } from 'node:buffer'
import concat from 'concat-stream'
import { parse as parseCSV } from 'csv-parse/sync'
import JSZip from 'jszip'
import * as tarStream from 'tar-stream'
import { v4 as uuidv4 } from 'uuid'
import { addAnnotation } from '@/actions/annotation/annotationActions'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'
import { MAX_DOCUMENTS_PER_IMPORT, MAX_IMPORT_UNCOMPRESSED_BYTES } from '@/lib/constants'
import {
  extractEntitiesFromTriplet,
  findEntityPositionsInTable,
  parseTripletsString,
} from './iritTriplets'

const FILENAMES = {
  PARAGRAPHS_CSV: 'Annotation_paragraphes.csv',
  TABLES_CSV: 'Annotation_tables.csv',
  TABLES_ARCHIVE: 'Tables.tar.gz',
}

const CSV_RECORD_KEYS = {
  LINK_WIKIPEDIA: 'Link_to_wikipedia_page',
  PARAGRAPH_TEXT_OPTIONS: ['Paragraphe', 'Paragraph'],
  TRIPLETS: 'Triplets',
  TABLE_NAME_OPTIONS: ['Name Table', 'Name_Table'],
  SECTION_NAME_OPTIONS: ['Section Table', 'Section_Table'],
}

const NO_TRIPLETS_PLACEHOLDER = 'No triplets'
const DEFAULT_DOCUMENT_TITLE = 'Unknown Document'

/**
 * Represents a paragraph extracted from the CSV.
 */
type ParagraphInfo = {
  text: string
  triplets: string
}

/**
 * Represents a table extracted from the CSV, including its content.
 */
type TableInfo = {
  tableName: string
  sectionName: string
  tableContent: string // CSV content of the table itself
  triplets: string
}

/**
 * Aggregated data for a document before it's inserted into the database.
 */
type ProcessedDocument = {
  url: string
  title: string
  corpusId: string
  paragraphs: ParagraphInfo[]
  tables: TableInfo[]
}

/**
 * Represents a file extracted from the Tables.tar.gz archive.
 */
type ExtractedTableFile = {
  name: string // Normalized table name
  content: string // CSV content of the table file
}

/**
 * Structure for annotations to be created.
 */
type TripletAnnotationSource = {
  subject: DocumentAnnotationComponent
  predicate: DocumentAnnotationComponent
  object: DocumentAnnotationComponent
}

/**
 * Safely retrieves a value from a CSV record object using a list of possible keys.
 */
function getCsvRecordValue(record: Record<string, unknown>, keys: string[], defaultValue = ''): string {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return String(record[key])
    }
  }
  return defaultValue
}

/**
 * Finds relevant files within the ZIP archive.
 */
function findRequiredFiles(zip: JSZip): {
  paragraphsFile?: JSZip.JSZipObject
  tablesFile?: JSZip.JSZipObject
  tablesArchive?: JSZip.JSZipObject
} {
  const allFiles = Object.values(zip.files).filter(zipEntry => !zipEntry.dir)
  // Use endsWith to be more resilient to files being in subdirectories within the zip
  return {
    paragraphsFile: allFiles.find(file => file.name.endsWith(FILENAMES.PARAGRAPHS_CSV)),
    tablesFile: allFiles.find(file => file.name.endsWith(FILENAMES.TABLES_CSV)),
    tablesArchive: allFiles.find(file => file.name.endsWith(FILENAMES.TABLES_ARCHIVE)),
  }
}

/**
 * Extracts document title from a Wikipedia URL.
 * Example: "https://en.wikipedia.org/wiki/Artificial_intelligence" -> "Artificial intelligence"
 */
function extractDocumentTitleFromUrl(url: string): string {
  try {
    const decodedUrl = decodeURIComponent(url)
    const lastPart = decodedUrl.split('/').pop()
    if (lastPart && lastPart.trim() !== '') {
      return lastPart.replace(/_/g, ' ').trim()
    }
  } catch (error) {
    console.error(`Error extracting document title from URL: ${url}`, error)
  }
  return DEFAULT_DOCUMENT_TITLE
}

/**
 * Extracts and decompresses files from a tar.gz archive buffer into memory.
 * @param archiveBuffer Buffer of the .tar.gz file.
 * @returns A record mapping filenames to their Buffer content.
 */
async function extractTarGzArchiveToMemory(archiveBuffer: Buffer): Promise<Record<string, Buffer>> {
  return new Promise((resolve, reject) => {
    const extract = tarStream.extract()
    const files: Record<string, Buffer> = {}

    extract.on('entry', (header, stream, next) => {
      if (header.type === 'directory' || !header.name) {
        stream.resume() // Consume stream for directories
        next()
        return
      }

      stream.pipe(concat((data: Buffer) => {
        files[header.name] = data
        next()
      }))
      stream.on('error', (err) => { // Handle stream errors for individual entries
        console.error(`Error processing entry ${header.name} in tar archive:`, err)
        next(err) // Propagate error to tar-stream
      })
    })

    extract.on('finish', () => resolve(files))
    extract.on('error', (err) => {
      console.error('Error extracting tar archive:', err)
      reject(err)
    })
    extract.end(archiveBuffer)
  })
}

/**
 * Processes the Tables.tar.gz archive to extract individual table CSV files.
 */
async function processTablesArchive(
  tablesArchiveZipEntry: JSZip.JSZipObject,
  targetTableFiles: ExtractedTableFile[],
): Promise<void> {
  try {
    const compressedBuffer = Buffer.from(await tablesArchiveZipEntry.async('arraybuffer'))
    const extractedFiles = await extractTarGzArchiveToMemory(compressedBuffer)

    Object.entries(extractedFiles).forEach(([filepath, contentBuffer]) => {
      const filename = filepath.split('/').pop() || filepath
      if (filename.toLowerCase().endsWith('.csv')) {
        const tableName = filename
          .replace(/\.csv$/i, '')
          .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
          .trim()

        targetTableFiles.push({
          name: tableName,
          content: contentBuffer.toString('utf-8'),
        })
      }
    })
  } catch (error) {
    console.error('Error processing tables archive:', error)
  }
}

/**
 * Processes the paragraphs CSV file (Annotation_paragraphes.csv).
 */
async function processParagraphsFile(
  paragraphsZipEntry: JSZip.JSZipObject,
  documentsByUrlMap: Map<string, ProcessedDocument>,
  corpusId: string,
): Promise<void> {
  try {
    const csvContent = await paragraphsZipEntry.async('string')
    const records: Record<string, string>[] = parseCSV(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    })

    for (const record of records) {
      const wikipediaLink = getCsvRecordValue(record, [CSV_RECORD_KEYS.LINK_WIKIPEDIA])
      const paragraphText = getCsvRecordValue(record, CSV_RECORD_KEYS.PARAGRAPH_TEXT_OPTIONS)
      const triplets = getCsvRecordValue(record, [CSV_RECORD_KEYS.TRIPLETS])

      if (!wikipediaLink || !paragraphText || triplets === NO_TRIPLETS_PLACEHOLDER || !triplets) {
        continue
      }

      if (!documentsByUrlMap.has(wikipediaLink)) {
        documentsByUrlMap.set(wikipediaLink, {
          url: wikipediaLink,
          title: extractDocumentTitleFromUrl(wikipediaLink),
          corpusId,
          paragraphs: [],
          tables: [],
        })
      }

      documentsByUrlMap.get(wikipediaLink)!.paragraphs.push({
        text: paragraphText,
        triplets: triplets || '',
      })
    }
  } catch (error) {
    console.error('Error parsing paragraphs CSV file:', error)
  }
}

/**
 * Finds matching table content from the extracted table files.
 * Prioritizes exact matches, then falls back to partial matches.
 */
function findMatchingTableContent(
  targetTableName: string,
  availableTableFiles: ExtractedTableFile[],
): string {
  const normalizedTargetName = targetTableName
    .replace(/[_-]/g, ' ')
    .trim()
    .toLowerCase()

  const exactMatch = availableTableFiles.find(tf => tf.name.toLowerCase() === normalizedTargetName)
  if (exactMatch)
    return exactMatch.content

  const partialMatches = availableTableFiles.filter((tf) => {
    const tfNameLower = tf.name.toLowerCase()
    return tfNameLower.includes(normalizedTargetName) || normalizedTargetName.includes(tfNameLower)
  })

  return partialMatches.length > 0 ? partialMatches[0].content : ''
}

/**
 * Processes the tables CSV file (Annotation_tables.csv).
 */
async function processTablesMetadataFile(
  tablesMetadataZipEntry: JSZip.JSZipObject,
  documentsByUrlMap: Map<string, ProcessedDocument>,
  corpusId: string,
  extractedTableFiles: ExtractedTableFile[],
): Promise<void> {
  try {
    const csvContent = await tablesMetadataZipEntry.async('string')
    const records: Record<string, string>[] = parseCSV(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    })

    for (const record of records) {
      const wikipediaLink = getCsvRecordValue(record, [CSV_RECORD_KEYS.LINK_WIKIPEDIA])
      const tableName = getCsvRecordValue(record, CSV_RECORD_KEYS.TABLE_NAME_OPTIONS)
      const sectionName = getCsvRecordValue(record, CSV_RECORD_KEYS.SECTION_NAME_OPTIONS)
      const triplets = getCsvRecordValue(record, [CSV_RECORD_KEYS.TRIPLETS])

      if (!wikipediaLink || !tableName || !triplets || triplets === NO_TRIPLETS_PLACEHOLDER) {
        continue
      }

      if (!documentsByUrlMap.has(wikipediaLink)) {
        const title = `${extractDocumentTitleFromUrl(wikipediaLink)} - ${tableName || 'Table'}`
        documentsByUrlMap.set(wikipediaLink, {
          url: wikipediaLink,
          title,
          corpusId,
          paragraphs: [],
          tables: [],
        })
      }

      const docEntry = documentsByUrlMap.get(wikipediaLink)!
      docEntry.tables.push({
        tableName,
        sectionName,
        tableContent: findMatchingTableContent(tableName, extractedTableFiles),
        triplets,
      })
    }
  } catch (error) {
    console.error('Error parsing tables metadata CSV file:', error)
  }
}

/**
 * Creates a document record in the database.
 */
async function createDocumentInDb(docData: ProcessedDocument, order: number): Promise<string> {
  const textsForDb = docData.paragraphs.map((paragraph, index) => {
    const precedingTextLength = docData.paragraphs
      .slice(0, index)
      .reduce((acc, p) => acc + p.text.length + 1, 0) // +1 for assumed separator like newline

    return {
      startOffset: precedingTextLength,
      endOffset: precedingTextLength + paragraph.text.length,
      value: paragraph.text,
    }
  })

  const tablesForDb = docData.tables
    .filter(table => table.tableContent && table.tableContent.trim() !== '')
    .map(table => ({
      startOffset: 0, // Offset within the table content itself
      endOffset: table.tableContent.length,
      tableData: parseCSV(table.tableContent), // Assuming tableContent is valid CSV
    }))

  const documentPayload: DocumentData = {
    _source: {
      identificationMetadata: {
        id: docData.title, // Consider a more unique ID if titles can collide
        title: docData.title,
        versionDate: new Date().toISOString(),
        hash: docData.title, // Consider a content hash if needed for uniqueness/versioning
        wikidata: '', // Placeholder or needs actual data
        url: [docData.url],
      },
      extractionMetadata: [{
        technology: 'text', // Or more specific if applicable
        texts: textsForDb,
        tables: tablesForDb,
      }],
    },
  }

  const [insertedDocument] = await db.insert(document).values({
    corpusId: docData.corpusId,
    title: docData.title,
    raw: documentPayload,
    order,
  }).returning({ id: document.id })

  if (!insertedDocument || !insertedDocument.id) {
    throw new Error(`Failed to insert document for URL: ${docData.url}`)
  }
  return insertedDocument.id
}

/**
 * Helper to create an annotation component with common properties.
 */
function createAnnotationComponent(
  value: string,
  start: number,
  end: number,
  elementIndex: number,
  tag: 'subject' | 'predicate' | 'object',
  type: 'text' | 'table',
  row: number | null = null,
  cell: number | null = null,
): DocumentAnnotationComponent {
  return {
    id: uuidv4(),
    annotationStart: start,
    annotationEnd: end,
    annotationValue: value,
    annotationType: type,
    annotationTag: tag,
    elementIndex,
    annotationCell: cell,
    annotationRow: row,
    entityCustom: true,
    entityCustomId: null, // Will be set when saved to database
    entityDatatype: 'string', // Default, might need adjustment based on actual entity types
    entityLabel: value,
    entityValue: value,
  }
}

/**
 * Extracts annotations from document paragraphs.
 */
function extractAnnotationsFromParagraphs(paragraphs: ParagraphInfo[]): TripletAnnotationSource[] {
  const annotations: TripletAnnotationSource[] = []
  let currentCharacterOffset = 0

  for (const paragraph of paragraphs) {
    if (!paragraph.triplets || paragraph.triplets === NO_TRIPLETS_PLACEHOLDER) {
      currentCharacterOffset += paragraph.text.length + 1 // +1 for assumed separator
      continue
    }

    const parsedTriplets = parseTripletsString(paragraph.triplets)
    for (const tripletStr of parsedTriplets) {
      const entities = extractEntitiesFromTriplet(tripletStr)
      if (!entities)
        continue

      const { relation, entity1, entity2 } = entities

      const entity1StartIndex = paragraph.text.toLowerCase().indexOf(entity1.toLowerCase())
      const entity2StartIndex = paragraph.text.toLowerCase().indexOf(entity2.toLowerCase())

      if (entity1StartIndex === -1 || entity2StartIndex === -1) {
        console.warn(`Entities not found in paragraph text: "${entity1}", "${entity2}" in "${paragraph.text.substring(0, 50)}..."`)
        continue
      }

      const docEntity1Start = currentCharacterOffset + entity1StartIndex
      const docEntity1End = docEntity1Start + entity1.length
      const docEntity2Start = currentCharacterOffset + entity2StartIndex
      const docEntity2End = docEntity2Start + entity2.length

      annotations.push({
        subject: createAnnotationComponent(entity1, docEntity1Start, docEntity1End, 0, 'subject', 'text'), // elementIndex 0 for main text body
        predicate: createAnnotationComponent(relation, 0, 0, 0, 'predicate', 'text'), // Predicates often don't have explicit spans
        object: createAnnotationComponent(entity2, docEntity2Start, docEntity2End, 0, 'object', 'text'),
      })
    }
    currentCharacterOffset += paragraph.text.length + 1 // +1 for assumed separator (e.g., newline)
  }
  return annotations
}

/**
 * Extracts annotations from document tables.
 */
function extractAnnotationsFromTables(
  tables: TableInfo[],
  paragraphCount: number, // Used to offset elementIndex for tables
): TripletAnnotationSource[] {
  const annotations: TripletAnnotationSource[] = []

  tables.forEach((table, tableIndex) => {
    if (!table.triplets || table.triplets === NO_TRIPLETS_PLACEHOLDER || !table.tableContent) {
      return
    }

    const currentElementIndex = paragraphCount + tableIndex
    let parsedTableData: string[][] = []
    try {
      parsedTableData = table.tableContent ? parseCSV(table.tableContent) : []
    } catch (csvParseError) {
      console.error(`Error parsing table content for table "${table.tableName}":`, csvParseError)
      return // Skip this table if its content is unparseable
    }

    const parsedTriplets = parseTripletsString(table.triplets)
    for (const tripletStr of parsedTriplets) {
      const entities = extractEntitiesFromTriplet(tripletStr)
      if (!entities)
        continue

      const { relation, entity1, entity2 } = entities
      const positions = findEntityPositionsInTable(entity1, entity2, parsedTableData)

      annotations.push({
        subject: createAnnotationComponent(
          entity1,
          0,
          entity1.length,
          currentElementIndex,
          'subject',
          'table',
          positions.entity1Row,
          positions.entity1Cell,
        ),
        predicate: createAnnotationComponent(
          relation,
          0,
          relation.length,
          currentElementIndex,
          'predicate',
          'table',
          null,
          null, // Predicates in tables might not have row/cell, or use header row
        ),
        object: createAnnotationComponent(
          entity2,
          0,
          entity2.length,
          currentElementIndex,
          'object',
          'table',
          positions.entity2Row,
          positions.entity2Cell,
        ),
      })
    }
  })
  return annotations
}

/**
 * Processes collected document data to create annotations in the database.
 */
async function createAnnotationsInDb(
  docData: ProcessedDocument,
  documentId: string,
): Promise<void> {
  const paragraphAnnotations = extractAnnotationsFromParagraphs(docData.paragraphs)
  const tableAnnotations = extractAnnotationsFromTables(docData.tables, docData.paragraphs.length)
  const allAnnotations = [...paragraphAnnotations, ...tableAnnotations]

  for (const anno of allAnnotations) {
    try {
      // The addAnnotation action expects individual entity properties,
      // so we spread them from the DocumentAnnotationComponent.
      await addAnnotation(
        documentId,
        anno.subject,
        {
          label: anno.subject.entityLabel || '',
          value: anno.subject.entityValue || '',
          custom: !!anno.subject.entityCustom,
          customId: anno.subject.entityCustomId || null,
          datatype: anno.subject.entityDatatype || 'string',
          type: 'subject',
        },
        anno.predicate,
        {
          label: anno.predicate.entityLabel || '',
          value: anno.predicate.entityValue || '',
          custom: !!anno.predicate.entityCustom,
          customId: anno.predicate.entityCustomId || null,
          datatype: anno.predicate.entityDatatype || 'string',
          type: 'predicate',
        },
        anno.object,
        {
          label: anno.object.entityLabel || '',
          value: anno.object.entityValue || '',
          custom: !!anno.object.entityCustom,
          customId: anno.object.entityCustomId || null,
          datatype: anno.object.entityDatatype || 'string',
          type: 'object',
        },
      )
    } catch (error) {
      console.error(`Error adding annotation for document ${documentId}:`, error, anno)
    }
  }
}

/**
 * Processes an IRIT-formatted ZIP archive containing document paragraphs, tables, and their annotations.
 * Extracts content, structures it, and imports it into the database.
 * @param corpusId The ID of the corpus to which these documents will belong.
 * @param zipBuffer The ArrayBuffer content of the ZIP archive.
 * @returns A promise that resolves to an array of imported document IDs.
 */
export async function importIritDocuments(
  corpusId: string,
  zipBuffer: ArrayBuffer,
): Promise<{ ids: string[], errors: string[], warnings: string[] }> {
  const importedDocumentIds: string[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const zip = await JSZip.loadAsync(zipBuffer)

  const totalUncompressedSize = Object.values(zip.files)
    .filter(entry => !entry.dir)
    .reduce((sum, entry) => sum + ((entry as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0), 0)
  if (totalUncompressedSize > MAX_IMPORT_UNCOMPRESSED_BYTES) {
    return {
      ids: [],
      errors: [`Archive is too large. The maximum extracted size is ${MAX_IMPORT_UNCOMPRESSED_BYTES / (1024 * 1024)} MB.`],
      warnings: [],
    }
  }

  const { paragraphsFile, tablesFile: tablesMetadataFile, tablesArchive } = findRequiredFiles(zip)

  const extractedTableFiles: ExtractedTableFile[] = []
  if (tablesArchive) {
    await processTablesArchive(tablesArchive, extractedTableFiles)
  }

  const documentsByUrl = new Map<string, ProcessedDocument>()

  if (paragraphsFile) {
    await processParagraphsFile(paragraphsFile, documentsByUrl, corpusId)
  }

  if (tablesMetadataFile) {
    await processTablesMetadataFile(tablesMetadataFile, documentsByUrl, corpusId, extractedTableFiles)
  }

  for (const [index, [, docData]] of Array.from(documentsByUrl.entries()).entries()) {
    if (docData.paragraphs.length === 0 && docData.tables.length === 0) {
      // eslint-disable-next-line no-console
      console.log(`Skipping document ${docData.title} (URL: ${docData.url}) as it has no content.`)
      continue
    }

    if (importedDocumentIds.length >= MAX_DOCUMENTS_PER_IMPORT) {
      warnings.push(`Import stopped at ${MAX_DOCUMENTS_PER_IMPORT} documents.`)
      break
    }

    try {
      const documentId = await createDocumentInDb(docData, index + 1)
      importedDocumentIds.push(documentId)
      await createAnnotationsInDb(docData, documentId)
    } catch (error) {
      errors.push(`Failed to process and import document ${docData.title} (URL: ${docData.url}): ${error}`)
      continue
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Import completed. ${importedDocumentIds.length} documents processed.`)
  return { ids: importedDocumentIds, errors, warnings }
}
