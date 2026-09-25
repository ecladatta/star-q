import pkg from '../../package.json'
import { withRequestTimeout } from './wikidata-sparql'

export type WikibaseProbeCheck = { ok: true } | { ok: false, error: string }
export type WikibaseProbeResult = {
  instanceApi: WikibaseProbeCheck
  sparql: WikibaseProbeCheck
}

const USER_AGENT = `star-q/${pkg.version} (https://github.com/ecladatta/star-q)`
const PROBE_QUERY = 'SELECT * WHERE { ?s ?p ?o } LIMIT 1'

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

async function checkInstanceApi(instanceUrl: string): Promise<WikibaseProbeCheck> {
  const base = instanceUrl.trim().replace(/\/+$/, '')
  if (!isHttpUrl(base)) {
    return { ok: false, error: 'Instance URL is not a valid http(s) URL' }
  }

  const requestUrl = `${base}/w/api.php?action=wbsearchentities&format=json&search=test&language=en&limit=1&type=item`
  let response: Response
  try {
    response = await withRequestTimeout(signal =>
      fetch(requestUrl, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }, signal }))
  } catch (error) {
    return {
      ok: false,
      error: isAbortError(error) ? 'Instance API request timed out' : 'Could not reach the instance API',
    }
  }

  if (!response.ok) {
    return { ok: false, error: `Instance API returned HTTP ${response.status}` }
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    return { ok: false, error: 'Instance API response was not valid JSON' }
  }

  if (
    typeof parsed !== 'object'
    || parsed === null
    || !('search' in parsed)
    || !Array.isArray(parsed.search)
  ) {
    return { ok: false, error: 'Endpoint does not look like a Wikibase API' }
  }

  return { ok: true }
}

async function checkSparqlEndpoint(sparqlEndpoint: string): Promise<WikibaseProbeCheck> {
  const endpoint = sparqlEndpoint.trim()
  if (!isHttpUrl(endpoint)) {
    return { ok: false, error: 'SPARQL endpoint is not a valid http(s) URL' }
  }

  let response: Response
  try {
    response = await withRequestTimeout(signal =>
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/sparql-results+json',
          'User-Agent': USER_AGENT,
        },
        body: new URLSearchParams({ query: PROBE_QUERY }).toString(),
        signal,
      }))
  } catch (error) {
    return {
      ok: false,
      error: isAbortError(error) ? 'SPARQL request timed out' : 'Could not reach the SPARQL endpoint',
    }
  }

  if (!response.ok) {
    return { ok: false, error: `SPARQL endpoint returned HTTP ${response.status}` }
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    return { ok: false, error: 'SPARQL response was not valid JSON' }
  }

  if (
    typeof parsed !== 'object'
    || parsed === null
    || !('results' in parsed)
    || typeof parsed.results !== 'object'
    || parsed.results === null
    || !('bindings' in parsed.results)
    || !Array.isArray(parsed.results.bindings)
  ) {
    return { ok: false, error: 'SPARQL response was not a valid SPARQL results document' }
  }

  return { ok: true }
}

export async function probeWikibaseInstance(input: { instanceUrl: string, sparqlEndpoint: string }): Promise<WikibaseProbeResult> {
  const [instanceApi, sparql] = await Promise.all([
    checkInstanceApi(input.instanceUrl),
    checkSparqlEndpoint(input.sparqlEndpoint),
  ])
  return { instanceApi, sparql }
}
