import { describe, expect, it } from 'vitest'
import { formatManualTime, parseManualTime } from './manualTime'

describe('manual time entry', () => {
  it.each([
    ['1', '0.01', 10], ['1234', '12.34', 12340],
    ['12345', '1:23.45', 83450], ['12.345', '12.345', 12345],
    ['1:23.45', '1:23.45', 83450],
  ])('formats and parses %s', (input, display, ms) => {
    expect(formatManualTime(input)).toBe(display)
    expect(parseManualTime(input)).toBe(ms)
  })
  it.each(['0', '1:60.00', '12..34', '1:2:3', '12.3456'])('rejects %s', input => {
    expect(parseManualTime(input)).toBeNull()
  })
})
