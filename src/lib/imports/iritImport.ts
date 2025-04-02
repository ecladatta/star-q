'use server'
import type { DocumentAnnotationComponent, DocumentData } from '@/app/corpus/[corpusId]/corpus-view'
import { Buffer } from 'node:buffer'
import { addAnnotation } from '@/actions/annotation/annotationActions'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'
import concat from 'concat-stream'
import { parse as parseCSV } from 'csv-parse/sync'
import JSZip from 'jszip'
import * as tarStream from 'tar-stream'
import { v4 as uuidv4 } from 'uuid'

/**
 * Processes an IRIT-formatted ZIP archive containing annotations and tables.
 */
export async function importIritDocuments(corpusId: string, buffer: ArrayBuffer): Promise<string[]> {
  const importedDocumentsIds: string[] = []
  const zip = await JSZip.loadAsync(buffer)

  // Find main files in the zip
  const files = Object.values(zip.files).filter(zipEntry => !zipEntry.dir)
  const paragraphsFile = files.find(file => file.name === 'Annotation_paragraphes.csv')
  const tablesFile = files.find(file => file.name === 'Annotation_tables.csv')
  const tablesArchive = files.find(file => file.name === 'Tables.tar.gz')

  // Extract and process files
  const tableFiles: Array<{ name: string, content: string }> = []
  if (tablesArchive) {
    await processTablesArchive(tablesArchive, tableFiles)
  }

  // Map to store documents by URL to merge paragraphs and tables from the same URL
  const documentsByUrl = new Map<string, {
    url: string
    title: string
    corpusId: string
    paragraphs: Array<{ text: string, triplets: string }>
    tables: Array<{ tableName: string, sectionName: string, tableContent: string, triplets: string }>
  }>()

  // Process main CSV files
  if (paragraphsFile) {
    await processParagraphsFile(paragraphsFile, documentsByUrl, corpusId)
  }

  if (tablesFile) {
    await processTablesFile(tablesFile, documentsByUrl, corpusId, tableFiles)
  }

  // Create documents and annotations
  for (const [, docData] of documentsByUrl.entries()) {
    // Skip if there's no content
    if (docData.paragraphs.length === 0 && docData.tables.length === 0) {
      continue
    }

    const documentId = await createDocument(docData)
    importedDocumentsIds.push(documentId)

    // Process annotations
    await processAnnotations(docData, documentId)
  }

  return importedDocumentsIds
}

/**
 * Extracts and processes tables from a tar.gz archive
 */
async function processTablesArchive(
  tablesArchive: JSZip.JSZipObject,
  tableFiles: Array<{ name: string, content: string }>,
): Promise<void> {
  try {
    const archiveBuffer = Buffer.from(await tablesArchive.async('arraybuffer'))
    const extractedFiles = await extractArchiveToMemory(archiveBuffer)

    // Process the extracted files
    Object.entries(extractedFiles).forEach(([filename, content]) => {
      const name = filename.split('/').pop() || filename
      if (name.toLowerCase().endsWith('.csv')) {
        const tableName = name.replace(/\.csv$/i, '')
          .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
          .trim()

        tableFiles.push({
          name: tableName,
          content: content.toString('utf-8'),
        })
      }
    })
  } catch (error) {
    console.error('Error extracting tables archive:', error)
  }
}

/**
 * Extract archive contents
 */
async function extractArchiveToMemory(inputBuffer: Buffer): Promise<Record<string, Buffer>> {
  return new Promise((resolve, reject) => {
    const extract = tarStream.extract()
    const files: Record<string, Buffer> = {}

    extract.on('entry', (header, stream, next) => {
      if (header.type === 'directory') {
        stream.resume()
        next()
        return
      }

      stream.pipe(concat((data: Buffer) => {
        files[header.name] = data
        next()
      }))
    })

    extract.on('finish', () => resolve(files))
    extract.on('error', err => reject(err))
    extract.end(inputBuffer)
  })
}

/**
 * Processes the paragraphs CSV file
 */
async function processParagraphsFile(
  paragraphsFile: JSZip.JSZipObject,
  documentsByUrl: Map<string, any>,
  corpusId: string,
): Promise<void> {
  try {
    const csvContent = await paragraphsFile.async('string')
    const records = parseCSV(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    })

    for (const record of records) {
      const wikipediaLink = record.Link_to_wikipedia_page || ''
      const paragraphText = record.Paragraphe || record.Paragraph || ''
      const triplets = record.Triplets || ''

      // Skip if essential data is missing or has no triplets
      if (!wikipediaLink || !paragraphText || paragraphText === 'No triplets') {
        continue
      }

      // Get or create document in map
      if (!documentsByUrl.has(wikipediaLink)) {
        documentsByUrl.set(wikipediaLink, {
          url: wikipediaLink,
          title: extractDocumentTitleFromUrl(wikipediaLink),
          corpusId,
          paragraphs: [],
          tables: [],
        })
      }

      // Add this paragraph
      documentsByUrl.get(wikipediaLink)!.paragraphs.push({
        text: paragraphText,
        triplets: triplets || '',
      })
    }
  } catch (error) {
    console.error('Error parsing paragraphs CSV file:', error)
  }
}

/**
 * Processes the tables CSV file
 */
async function processTablesFile(
  tablesFile: JSZip.JSZipObject,
  documentsByUrl: Map<string, any>,
  corpusId: string,
  tableFiles: Array<{ name: string, content: string }>,
): Promise<void> {
  try {
    const csvContent = await tablesFile.async('string')
    const records = parseCSV(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    })

    for (const record of records) {
      const wikipediaLink = record.Link_to_wikipedia_page || ''
      const tableName = record['Name Table'] || record.Name_Table || ''
      const sectionName = record['Section Table'] || record.Section_Table || ''
      const triplets = record.Triplets || ''

      // Skip invalid entries
      if (!wikipediaLink || !tableName || !triplets || triplets === 'No triplets') {
        continue
      }

      // Get or create document
      if (!documentsByUrl.has(wikipediaLink)) {
        const title = `${extractDocumentTitleFromUrl(wikipediaLink)} - ${tableName || 'Table'} Table`
        documentsByUrl.set(wikipediaLink, {
          url: wikipediaLink,
          title,
          corpusId,
          paragraphs: [],
          tables: [],
        })
      }

      // Find table content and add to document
      documentsByUrl.get(wikipediaLink)!.tables.push({
        tableName,
        sectionName,
        tableContent: findMatchingTableContent(tableName, tableFiles),
        triplets,
      })
    }
  } catch (error) {
    console.error('Error parsing tables CSV file:', error)
  }
}

/**
 * Extract document title from a Wikipedia URL
 */
function extractDocumentTitleFromUrl(url: string): string {
  try {
    const lastPart = url.split('/').pop()
    if (lastPart && lastPart.trim() !== '') {
      return decodeURIComponent(lastPart.replace(/_/g, ' '))
    }
  } catch (error) {
    console.error('Error extracting document title from URL:', url, error)
  }
  return 'Unknown Document'
}

/**
 * Find matching table content
 */
function findMatchingTableContent(
  tableName: string,
  tableFiles: Array<{ name: string, content: string }>,
): string {
  const normalizedTableName = tableName
    .replace(/[_-]/g, ' ')
    .trim()
    .toLowerCase()

  // Try exact match first
  const exactMatch = tableFiles.find(tf =>
    tf.name.toLowerCase() === normalizedTableName,
  )

  if (exactMatch)
    return exactMatch.content

  // Try partial matches
  const partialMatches = tableFiles.filter((tf) => {
    const tfName = tf.name.toLowerCase()
    return tfName.includes(normalizedTableName)
      || normalizedTableName.includes(tfName)
  })

  return partialMatches.length > 0 ? partialMatches[0].content : ''
}

/**
 * Creates a document in the database
 */
async function createDocument(docData: any): Promise<string> {
  // Create texts array from paragraphs
  const texts = docData.paragraphs.map((paragraph: any, index: number) => {
    const startOffset = index === 0
      ? 0
      : docData.paragraphs.slice(0, index).reduce((acc: number, p: any) => acc + p.text.length + 1, 0)

    return {
      startOffset,
      endOffset: startOffset + paragraph.text.length,
      value: paragraph.text,
    }
  })

  // Process tables with content
  const tables = docData.tables
    .filter((table: any) => table.tableContent && table.tableContent.trim() !== '')
    .map((table: any) => ({
      startOffset: 0,
      endOffset: table.tableContent.length,
      tableData: parseCSV(table.tableContent),
    }))

  // Create document data
  const raw: DocumentData = {
    _source: {
      identificationMetadata: {
        id: docData.title,
        title: docData.title,
        versionDate: new Date().toISOString(),
        hash: docData.title,
        wikidata: '',
        url: [docData.url],
      },
      extractionMetadata: [{
        technology: 'text',
        texts,
        tables,
      }],
    },
  }

  // Insert document
  const [documentId] = await db.insert(document).values({
    corpusId: docData.corpusId,
    title: docData.title,
    raw,
  }).returning({ id: document.id })

  return documentId.id
}

/**
 * Process all annotations from a document
 */
async function processAnnotations(docData: any, documentId: string): Promise<void> {
  // Process paragraph triplets
  const paragraphAnnotations = extractAnnotationsFromParagraphs(docData.paragraphs)

  // Process table triplets
  const tableAnnotations = extractAnnotationsFromTables(
    docData.tables,
    docData.paragraphs.length,
  )

  // Combined annotations
  const allAnnotations = [...paragraphAnnotations, ...tableAnnotations]

  // Create annotations in DB
  for (const annotation of allAnnotations) {
    try {
      await addAnnotation(
        documentId,
        annotation.subject,
        {
          label: annotation.subject.entityLabel || '',
          value: annotation.subject.entityValue || '',
          custom: true,
          datatype: 'string',
        },
        annotation.predicate,
        {
          label: annotation.predicate.entityLabel || '',
          value: annotation.predicate.entityValue || '',
          custom: true,
          datatype: 'string',
        },
        annotation.object,
        {
          label: annotation.object.entityLabel || '',
          value: annotation.object.entityValue || '',
          custom: true,
          datatype: 'string',
        },
      )
    } catch (error) {
      console.error('Error adding annotation:', error)
    }
  }
}

/**
 * Extract annotations from paragraphs
 */
function extractAnnotationsFromParagraphs(paragraphs: any[]): Array<{
  subject: DocumentAnnotationComponent
  predicate: DocumentAnnotationComponent
  object: DocumentAnnotationComponent
}> {
  const annotations = []

  // Accumulate offset for paragraphs
  let accumulatedOffset = 0

  for (const [, paragraph] of paragraphs.entries()) {
    if (!paragraph.triplets || paragraph.triplets === 'No triplets') {
      // Update accumulated offset even for skipped paragraphs
      accumulatedOffset += paragraph.text.length + 1
      continue
    }

    const triplets = parseTriplets(paragraph.triplets)

    for (const triplet of triplets) {
      const entities = extractTripletEntities(triplet)
      if (!entities)
        continue

      const { relation, entity1, entity2 } = entities
      const entity1Clean = entity1.trim()
      const entity2Clean = entity2.trim()
      const relationClean = relation.trim()

      // Find positions in text
      const entity1Pos = paragraph.text.toLowerCase().indexOf(entity1Clean.toLowerCase())
      const entity2Pos = paragraph.text.toLowerCase().indexOf(entity2Clean.toLowerCase())

      if (entity1Pos === -1 || entity2Pos === -1)
        continue

      const docEntity1Start = accumulatedOffset + entity1Pos
      const docEntity1End = docEntity1Start + entity1Clean.length
      const docEntity2Start = accumulatedOffset + entity2Pos
      const docEntity2End = docEntity2Start + entity2Clean.length

      annotations.push({
        subject: createAnnotationComponent(entity1Clean, docEntity1Start, docEntity1End, 0, 'subject', 'text'),
        predicate: createAnnotationComponent(relationClean, 0, 0, 0, 'predicate', 'text'),
        object: createAnnotationComponent(entity2Clean, docEntity2Start, docEntity2End, 0, 'object', 'text'),
      })
    }

    // Update accumulated offset for next paragraph
    accumulatedOffset += paragraph.text.length + 1
  }

  return annotations
}

/**
 * Extract annotations from tables
 */
function extractAnnotationsFromTables(tables: any[], paragraphCount: number): Array<{
  subject: DocumentAnnotationComponent
  predicate: DocumentAnnotationComponent
  object: DocumentAnnotationComponent
}> {
  const annotations = []

  for (const [tableIndex, table] of tables.entries()) {
    if (!table.triplets || table.triplets === 'No triplets')
      continue

    const elementIndex = paragraphCount + tableIndex
    const tableData = table.tableContent ? parseCSV(table.tableContent) : []
    const triplets = parseTriplets(table.triplets)

    for (const triplet of triplets) {
      const entities = extractTripletEntities(triplet)
      if (!entities)
        continue

      const { relation, entity1, entity2 } = entities
      const entity1Clean = entity1.trim()
      const entity2Clean = entity2.trim()
      const relationClean = relation.trim()

      // Find entities in table
      const positions = findEntitiesInTable(entity1Clean, entity2Clean, tableData)

      annotations.push({
        subject: createAnnotationComponent(
          entity1Clean,
          0,
          entity1Clean.length,
          elementIndex,
          'subject',
          'table',
          positions.entity1Row,
          positions.entity1Cell,
        ),
        predicate: createAnnotationComponent(
          relationClean,
          0,
          relationClean.length,
          elementIndex,
          'predicate',
          'table',
          0,
          0,
        ),
        object: createAnnotationComponent(
          entity2Clean,
          0,
          entity2Clean.length,
          elementIndex,
          'object',
          'table',
          positions.entity2Row,
          positions.entity2Cell,
        ),
      })
    }
  }

  return annotations
}

/**
 * Helper to create an annotation component
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
    entityDatatype: 'string',
    entityLabel: value,
    entityValue: value,
  }
}

/**
 * Parse triplets from a semicolon-separated string
 */
function parseTriplets(triplets: string): string[] {
  // Quick check for empty input
  if (!triplets || triplets.trim() === '')
    return []

  try {
    const rawTripletList = []
    let currentTriplet = ''
    let inQuote = false
    let inBrace = 0

    for (let i = 0; i < triplets.length; i++) {
      const char = triplets[i]

      if (char === '"') {
        inQuote = !inQuote
        currentTriplet += char
      } else if (char === '{') {
        inBrace++
        currentTriplet += char
      } else if (char === '}') {
        inBrace = Math.max(0, inBrace - 1) // Prevent negative brace count
        currentTriplet += char
      } else if (char === ';' && !inQuote && inBrace === 0) {
        if (currentTriplet.trim()) {
          rawTripletList.push(currentTriplet.trim())
        }
        currentTriplet = ''
      } else {
        currentTriplet += char
      }
    }

    // Add the last triplet
    if (currentTriplet.trim()) {
      rawTripletList.push(currentTriplet.trim())
    }

    // Check for unclosed quotes or braces
    if (inQuote || inBrace > 0) {
      console.warn(`Warning: Possibly malformed triplet string with unclosed quotes or braces: ${triplets}`)
    }

    return rawTripletList
  } catch (error) {
    console.error('Error parsing triplets:', error)
    return []
  }
}

/**
 * Extract triplet components
 */
function extractTripletEntities(triplet: string): { relation: string, entity1: string, entity2: string } | null {
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const match = triplet.match(/\{([^:]+):\s*([^,]+),\s*([^}]+)\}/)
  if (!match || match.length < 4) {
    return null
  }
  return { relation: match[1], entity1: match[2], entity2: match[3] }
}

/**
 * Find entity positions in table data
 */
function findEntitiesInTable(
  entity1: string,
  entity2: string,
  tableData: any[][],
): {
    entity1Row: number
    entity1Cell: number
    entity2Row: number
    entity2Cell: number
  } {
  let entity1Row = 0
  let entity1Cell = 1
  let entity2Row = 0
  let entity2Cell = 2

  // Default to standard positions if no table data
  if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
    return { entity1Row, entity1Cell, entity2Row, entity2Cell }
  }

  // Search for entities in the table
  const e1Lower = entity1.toLowerCase()
  const e2Lower = entity2.toLowerCase()

  for (let rowIdx = 0; rowIdx < tableData.length; rowIdx++) {
    const row = tableData[rowIdx]
    if (!Array.isArray(row))
      continue

    for (let cellIdx = 0; cellIdx < row.length; cellIdx++) {
      const cellValue = String(row[cellIdx]).toLowerCase()

      if (cellValue.includes(e1Lower)) {
        entity1Row = rowIdx
        entity1Cell = cellIdx
      }

      if (cellValue.includes(e2Lower)) {
        entity2Row = rowIdx
        entity2Cell = cellIdx
      }
    }
  }

  return { entity1Row, entity1Cell, entity2Row, entity2Cell }
}
