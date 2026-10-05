import { describe, expect, it } from 'vitest'
import bn from './locales/bn.json'
import en from './locales/en.json'

type Json = Record<string, unknown>

function keyPaths(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object'
      ? keyPaths(value as Json, path)
      : [path]
  })
}

function placeholders(locale: Json): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const path of keyPaths(locale)) {
    const value = path
      .split('.')
      .reduce<unknown>(
        (node, segment) =>
          node && typeof node === 'object'
            ? (node as Json)[segment]
            : undefined,
        locale
      )
    if (typeof value === 'string') {
      result.set(
        path,
        new Set([...value.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))
      )
    }
  }
  return result
}

describe('locale files', () => {
  it('keeps bn and en key sets identical', () => {
    expect(keyPaths(bn as Json).sort()).toEqual(keyPaths(en as Json).sort())
  })

  it('keeps interpolation placeholders identical across locales', () => {
    const enPlaceholders = placeholders(en as Json)
    const bnPlaceholders = placeholders(bn as Json)
    for (const [path, expected] of enPlaceholders) {
      expect(bnPlaceholders.get(path), path).toEqual(expected)
    }
  })
})
