import { describe, expect, it } from 'vitest'
import {
  extractEntitiesFromTriplet,
  findEntityPositionsInTable,
  parseTripletsString,
} from './iritTriplets'

describe('parseTripletsString', () => {
  it('returns an empty array for empty input', () => {
    expect(parseTripletsString('')).toEqual([])
    expect(parseTripletsString('   ')).toEqual([])
  })

  it('splits semicolon-separated triplets', () => {
    expect(parseTripletsString('{a: x, y}; {b: z, w}')).toEqual([
      '{a: x, y}',
      '{b: z, w}',
    ])
  })

  it('does not split on semicolons inside quoted triplets', () => {
    expect(parseTripletsString('{a: x; y}')).toEqual(['{a: x; y}'])
  })

  it('does not split on semicolons inside braces', () => {
    expect(parseTripletsString('{a: x, {nested; value}}')).toEqual([
      '{a: x, {nested; value}}',
    ])
  })
})

describe('extractEntitiesFromTriplet', () => {
  it('extracts relation and entities separated by a comma', () => {
    expect(extractEntitiesFromTriplet('{located in: Paris, France}')).toEqual({
      relation: 'located in',
      entity1: 'Paris',
      entity2: 'France',
    })
  })

  it('supports semicolon as an entity separator', () => {
    expect(extractEntitiesFromTriplet('{relation: entity1; entity2}')).toEqual({
      relation: 'relation',
      entity1: 'entity1',
      entity2: 'entity2',
    })
  })

  it('keeps colons that appear inside entities', () => {
    expect(extractEntitiesFromTriplet('{relation: a:b, c}')).toEqual({
      relation: 'relation',
      entity1: 'a:b',
      entity2: 'c',
    })
  })

  it('returns null when the triplet has no braces', () => {
    expect(extractEntitiesFromTriplet('relation: x, y')).toBeNull()
  })

  it('returns null when the colon separator is missing', () => {
    expect(extractEntitiesFromTriplet('{x y}')).toBeNull()
  })

  it('returns null when fewer than two entities are present', () => {
    expect(extractEntitiesFromTriplet('{relation: onlyone}')).toBeNull()
  })
})

describe('findEntityPositionsInTable', () => {
  const table = [
    ['Name', 'Country'],
    ['Paris', 'France'],
    ['Berlin', 'Germany'],
  ]

  it('locates both entities case-insensitively', () => {
    expect(findEntityPositionsInTable('paris', 'FRANCE', table)).toEqual({
      entity1Row: 1,
      entity1Cell: 0,
      entity2Row: 1,
      entity2Cell: 1,
    })
  })

  it('matches entities by substring within a cell', () => {
    expect(findEntityPositionsInTable('Ber', 'any', table)).toEqual({
      entity1Row: 2,
      entity1Cell: 0,
      entity2Row: 2,
      entity2Cell: 1,
    })
  })

  it('falls back to default positions when entities are absent', () => {
    expect(findEntityPositionsInTable('nowhere', 'missing', table)).toEqual({
      entity1Row: 0,
      entity1Cell: 1,
      entity2Row: 0,
      entity2Cell: 2,
    })
  })

  it('returns defaults for an empty table', () => {
    expect(findEntityPositionsInTable('x', 'y', [])).toEqual({
      entity1Row: 0,
      entity1Cell: 1,
      entity2Row: 0,
      entity2Cell: 2,
    })
  })
})
