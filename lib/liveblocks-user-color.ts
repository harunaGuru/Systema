export function liveblocksUserColor(userId: string): string {
  let hash = 2166136261

  for (const character of userId) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }

  const hue = (hash >>> 0) % 360
  return `hsl(${hue} 68% 46%)`
}
