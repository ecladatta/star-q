/**
 * Parses a semicolon-separated string of triplets.
 * Handles triplets enclosed in quotes or containing braces.
 * Example input: '{relation: entity1, entity2}; "{relation2: "complex, entity", entity with {brace}}"'.
 */
export function parseTripletsString(tripletsStr: string): string[] {
  if (!tripletsStr || tripletsStr.trim() === '')
    return []

  const parsedTriplets: string[] = []
  let currentTriplet = ''
  let inQuote = false
  let braceLevel = 0

  for (let i = 0; i < tripletsStr.length; i++) {
    const char = tripletsStr[i]
    currentTriplet += char

    if (char === '"' && (i === 0 || tripletsStr[i - 1] !== '\\')) { // Ignore escaped quotes
      inQuote = !inQuote
    } else if (char === '{' && !inQuote) {
      braceLevel++
    } else if (char === '}' && !inQuote) {
      braceLevel = Math.max(0, braceLevel - 1)
    } else if (char === ';' && !inQuote && braceLevel === 0) {
      // Trim the semicolon itself from the pushed triplet
      const trimmedTriplet = currentTriplet.slice(0, -1).trim()
      if (trimmedTriplet) {
        parsedTriplets.push(trimmedTriplet)
      }
      currentTriplet = '' // Reset for the next triplet
    }
  }

  // Add the last triplet if any
  const finalTriplet = currentTriplet.trim()
  if (finalTriplet) {
    parsedTriplets.push(finalTriplet)
  }

  if (inQuote || braceLevel > 0) {
    console.warn(`Warning: Potentially malformed triplet string (unclosed quotes or braces): "${tripletsStr}"`)
  }

  return parsedTriplets
}

/**
 * Extracts relation and entities from a single triplet string.
 * Assumes triplet format: "{relation: entity1, entity2}" or "{relation: entity1; entity2}".
 * Ignores any content that appears after the closing curly brace.
 */
export function extractEntitiesFromTriplet(triplet: string): { relation: string, entity1: string, entity2: string } | null {
  // Find the main triplet part within curly braces
  const braceMatch = triplet.match(/\{([^}]+)\}/)
  if (!braceMatch || !braceMatch[1]) {
    console.warn(`Could not find triplet content in curly braces: "${triplet}"`)
    return null
  }

  // Extract components from within the braces
  const tripletContent = braceMatch[1].trim()
  const parts = tripletContent.split(':')

  if (parts.length < 2) {
    console.warn(`Invalid triplet format (missing colon): "${triplet}"`)
    return null
  }

  const relation = parts[0].trim()
  const entitiesPart = parts.slice(1).join(':').trim() // Rejoin in case entities contain colons

  // Split entities by comma or semicolon
  const entitySeparator = entitiesPart.includes(',') ? ',' : ';'
  const entities = entitiesPart.split(entitySeparator)

  if (entities.length < 2) {
    console.warn(`Invalid triplet format (missing entity separator): "${triplet}"`)
    return null
  }

  return {
    relation,
    entity1: entities[0].trim(),
    entity2: entities.slice(1).join(entitySeparator).trim(), // Rejoin remaining parts in case of extra separators
  }
}

/**
 * Finds the row and cell indices of entities within parsed table data (array of arrays).
 * Defaults to specific columns if entities are not found.
 */
export function findEntityPositionsInTable(
  entity1Search: string,
  entity2Search: string,
  tableData: string[][],
): { entity1Row: number, entity1Cell: number, entity2Row: number, entity2Cell: number } {
  // Default positions: assumes entity1 in the first data cell of a row, entity2 in the second.
  // These defaults might need to be (0,0) and (0,1) if table headers are not part of entity search.
  // Current defaults (0,1) and (0,2) are a bit arbitrary if table has no headers.
  // For this refactor, keeping existing logic: entity1 in col index 1, entity2 in col index 2 of *first row searched*.
  const positions = {
    entity1Row: 0,
    entity1Cell: 1, // Defaulting to [0,1]
    entity2Row: 0,
    entity2Cell: 2, // Defaulting to [0,2]
  }
  let e1Found = false
  let e2Found = false

  if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
    return positions // Return defaults if no table data
  }

  const e1Lower = entity1Search.toLowerCase()
  const e2Lower = entity2Search.toLowerCase()

  for (let rIdx = 0; rIdx < tableData.length; rIdx++) {
    const row = tableData[rIdx]
    if (!Array.isArray(row))
      continue

    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellValue = String(row[cIdx] || '').toLowerCase()

      if (!e1Found && cellValue.includes(e1Lower)) {
        positions.entity1Row = rIdx
        positions.entity1Cell = cIdx
        e1Found = true
      }
      if (!e2Found && cellValue.includes(e2Lower)) {
        positions.entity2Row = rIdx
        positions.entity2Cell = cIdx
        e2Found = true
      }
      if (e1Found && e2Found)
        return positions // Found both
    }
  }
  return positions // Return whatever was found, or defaults if one/both not found
}
