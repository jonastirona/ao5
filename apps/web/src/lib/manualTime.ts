/** Digits-only entry uses centiseconds, like a speedcube timer. */
export function formatManualTime(value: string): string {
  if (/[.:]/.test(value)) return value
  const digits = value.padStart(3, '0')
  const centis = digits.slice(-2)
  const seconds = Number(digits.slice(-4, -2))
  const minutes = Number(digits.slice(0, -4))
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}.${centis}`
    : `${seconds}.${centis}`
}

export function parseManualTime(value: string): number | null {
  const formatted = formatManualTime(value)
  const match = /^(?:(\d+):)?(\d{1,2})(?:\.(\d{1,3}))?$/.exec(formatted)
  if (!match) return null
  const seconds = Number(match[2])
  if (match[1] !== undefined && seconds >= 60) return null
  const ms = Number(match[1] ?? 0) * 60000 + seconds * 1000 +
    Number((match[3] ?? '').padEnd(3, '0'))
  return Number.isSafeInteger(ms) && ms > 0 ? ms : null
}
