import path from 'node:path'

export function resolveWithinBase(baseDir, ...segments) {
  const resolvedBase = path.resolve(baseDir)
  const resolvedTarget = path.resolve(resolvedBase, ...segments)

  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error('Resolved path escapes its base directory.')
  }

  return resolvedTarget
}
