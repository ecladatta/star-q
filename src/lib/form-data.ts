export function getRequiredString(formData: FormData, field: string): string {
  const value = formData.get(field)
  if (typeof value !== 'string') {
    throw new TypeError(`${field} is required.`)
  }
  return value
}
