import type { SolveEntry, Session } from '../store'
import type { PuzzleType } from 'core'
import { v4 as uuidv4 } from 'uuid'

// --- Types for Import/Export ---

// The schema requested for import/export
export interface ExportSolve {
  timeMs: number
  rawTimeMs: number
  penalty: 'OK' | '+2' | 'DNF'
  scramble: string
  timestamp: number
}

export interface ExportSession {
  id: string
  name: string
  createdAt: number
  solves: ExportSolve[]
}

// --- Helpers ---

const mapInternalToExportSolve = (solve: SolveEntry): ExportSolve => {
  let penalty: 'OK' | '+2' | 'DNF' = 'OK'
  const rawTimeMs = solve.timeMs
  let timeMs = solve.timeMs

  if (solve.penalty === 'plus2') {
    penalty = '+2'
    timeMs = solve.timeMs + 2000
  } else if (solve.penalty === 'DNF') {
    penalty = 'DNF'
    timeMs = Infinity // As per requirement: DNF -> timeMs = Infinity
    // rawTimeMs remains the recorded time
  }

  return {
    timeMs,
    rawTimeMs,
    penalty,
    scramble: solve.scramble,
    timestamp: solve.timestamp
  }
}

const mapExportToInternalSolve = (solve: ExportSolve, puzzleType: string = '3x3'): SolveEntry => {
  let penalty: 'plus2' | 'DNF' | null = null
  let timeMs = solve.rawTimeMs

  if (solve.penalty === '+2') {
    penalty = 'plus2'
    // Internal timeMs is usually the raw time for +2? 
    // Wait, store.ts says: "timeMs: ms" and "penalty: penalty".
    // In Analytics.tsx: "s.timeMs + (s.penalty === 'plus2' ? 2000 : 0)"
    // So internal timeMs is RAW time.
    timeMs = solve.rawTimeMs
  } else if (solve.penalty === 'DNF') {
    penalty = 'DNF'
    timeMs = solve.rawTimeMs
  }

  return {
    id: uuidv4(),
    scramble: solve.scramble || '',
    timeMs,
    timestamp: solve.timestamp || Date.now(),
    puzzleType: puzzleType as PuzzleType,
    penalty
  }
}

// --- Export Functions ---

export function exportAllSessionsToJSON(sessions: Session[]): string {
  // csTimer format:
  // {
  //   "session1": [[penalty, time(ms), scramble, comment, timestamp], ...],
  //   "session2": [...],
  //   "properties": {
  //     "session1": { "name": "Session Name", "opt": { "scrType": "333" } },
  //     "session2": { ... },
  //     "sessionData": "{\"1\":{\"name\":\"Session Name\",\"opt\":{\"scrType\":\"333\"}}, \"2\": ...}"
  //   }
  // }

  const csTimerMap: Record<string, string> = {
      '3x3': '333', '2x2': '222so', '4x4': '444wca', '5x5': '555wca',
      '6x6': '666wca', '7x7': '777wca', '3x3_oh': '333oh', '3x3_bld': '333ni',
      'clock': 'clkwca', 'megaminx': 'mgmp', 'pyraminx': 'pyrso', 'skewb': 'skbso', 'sq1': 'sq1',
      '3x3_fm': '333fm', '4x4_bld': '444bld', '5x5_bld': '555bld', '3x3_mbld': '333mbld'
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportData: any = {
      properties: {}
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionDataMap: any = {}

  sessions.forEach((session, index) => {
      const sessionKey = `session${index + 1}`
      const scrType = csTimerMap[session.puzzleType] || '333'

      // Format solves
      const solves = session.solves.map(s => {
          let penalty = 0
          if (s.penalty === 'plus2') penalty = 2000
          if (s.penalty === 'DNF') penalty = -1
          
          return [
              penalty,
              s.timeMs, 
              s.scramble,
              '', // comment
              Math.floor(s.timestamp / 1000)
          ]
      })

      exportData[sessionKey] = solves
      
      // Add to sessionData map (used inside properties.sessionData string)
      sessionDataMap[String(index + 1)] = {
          name: session.name,
          opt: {
              scrType: scrType
          }
      }
  })

  // csTimer puts the session metadata in a JSON string under properties.sessionData
  exportData.properties.sessionData = JSON.stringify(sessionDataMap)

  return JSON.stringify(exportData, null, 2)
}

export function exportSessionToCSV(session: Session): string {
  const header = 'timeMs,rawTimeMs,penalty,scramble,timestamp'
  const rows = session.solves.map(s => {
    const es = mapInternalToExportSolve(s)
    // CSV format: timeMs,rawTimeMs,penalty,scramble,timestamp
    // Escape scramble if it contains commas
    const scramble = es.scramble.includes(',') ? `"${es.scramble}"` : es.scramble
    return `${es.timeMs},${es.rawTimeMs},${es.penalty},${scramble},${es.timestamp}`
  })
  return [header, ...rows].join('\n')
}

export function exportSessionToText(session: Session): string {
  return session.solves.map(s => {
    const es = mapInternalToExportSolve(s)
    let line = (es.rawTimeMs / 1000).toFixed(2)
    if (es.penalty === '+2') line += ' +2'
    if (es.penalty === 'DNF') line = 'DNF'
    return line
  }).join('\n')
}

// --- Import Functions ---

export function parseImport(content: string, fileName: string): Session[] {
  content = content.trim()
  if (!content) return []

  // 1. Try JSON
  if (content.startsWith('{') || content.startsWith('[')) {
    try {
      const json = JSON.parse(content)
      return parseJSONImport(json, fileName)
    } catch {
      // Not JSON, continue
    }
  }

  // 2. Try CSV (Header detection)
  const firstLine = content.split('\n')[0]
  if (firstLine.includes(',') || firstLine.includes(';')) {
    // Basic heuristic for CSV
    return parseCSVImport(content, fileName)
  }

  // 3. Fallback to Plain Text
  return parseTextImport(content, fileName)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSONImport(json: any, fileName: string): Session[] {
  const sessions: Session[] = []

  // Case A: Our Export Format (Single Session)
  if (json.solves && Array.isArray(json.solves)) {
    sessions.push(convertExportSessionToInternal(json, fileName))
    return sessions
  }

  // Case B: csTimer
  // csTimer structure: { "session1": [times...], "session2": [times...], "properties": ... }
  // times array: [[penalty, time(ms), scramble], ...]
  // penalty: 0=OK, 2000=+2, -1=DNF
  // Case B: csTimer
  // csTimer structure: { "session1": [...], "properties": { "sessionData": "..." } }
  if (json.properties && json.properties.sessionData) {
    try {
        const sessionData = JSON.parse(json.properties.sessionData)
        
        // Iterate over session keys in properties (1, 2, 3...)
        Object.keys(sessionData).forEach(key => {
            const meta = sessionData[key]
            const sessionKey = `session${key}`
            const solvesData = json[sessionKey]
            
            if (solvesData && Array.isArray(solvesData) && solvesData.length > 0) {
                // Map csTimer puzzle types to our internal types
                const csTimerMap: Record<string, string> = {
                    '333': '3x3', '222so': '2x2', '444wca': '4x4', '555wca': '5x5',
                    '666wca': '6x6', '777wca': '7x7', '333oh': '3x3_oh', '333ni': '3x3_bld',
                    'clkwca': 'clock', 'mgmp': 'megaminx', 'pyrso': 'pyraminx', 'skbso': 'skewb', 'sq1': 'sq1',
                    '333fm': '3x3_fm', '444bld': '4x4_bld', '555bld': '5x5_bld', '333mbld': '3x3_mbld'
                }
                
                let puzzleType: string = '3x3'
                const scrType = meta.opt?.scrType
                if (scrType && csTimerMap[scrType]) {
                    puzzleType = csTimerMap[scrType]
                }
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const solves: SolveEntry[] = solvesData.map((item: any) => {
                    let penaltyVal, timeVal, scramble, timestampVal
                    
                    if (Array.isArray(item[0])) {
                        // Format: [[penalty, time], scramble, comment, timestamp]
                        const [pt] = item
                        penaltyVal = pt[0]
                        timeVal = pt[1]
                        scramble = item[1]
                        timestampVal = item[3]
                    } else {
                        // Format: [penalty, time, scramble, comment, timestamp]
                        [penaltyVal, timeVal, scramble, , timestampVal] = item
                    }

                    let penalty: 'plus2' | 'DNF' | null = null
                    const timeMs = timeVal
                    
                    if (penaltyVal === 2000) penalty = 'plus2'
                    if (penaltyVal === -1) penalty = 'DNF'

                    return {
                        id: uuidv4(),
                        scramble: scramble || '',
                        timeMs,
                        timestamp: timestampVal ? timestampVal * 1000 : Date.now(),
                        puzzleType: puzzleType as PuzzleType,
                        penalty
                    }
                })

                sessions.push({
                    id: uuidv4(),
                    name: `csTimer Session ${meta.name || key}`,
                    puzzleType: puzzleType as PuzzleType,
                    solves
                })
            }
        })
        
        return sessions
    } catch (e) {
        console.error('Failed to parse csTimer sessionData', e)
    }
  }

  // Fallback / Old csTimer logic (if properties missing)
  if (json.session1) {
    Object.keys(json).forEach(key => {
      if (key.startsWith('session')) {
        const solvesData = json[key]
        if (Array.isArray(solvesData) && solvesData.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const solves: SolveEntry[] = solvesData.map((item: any) => {
                let penaltyVal, timeVal, scramble, timestampVal
                
                if (Array.isArray(item[0])) {
                    const [pt] = item
                    penaltyVal = pt[0]
                    timeVal = pt[1]
                    scramble = item[1]
                    timestampVal = item[3]
                } else {
                    [penaltyVal, timeVal, scramble, , timestampVal] = item
                }

                let penalty: 'plus2' | 'DNF' | null = null
                const timeMs = timeVal
                
                if (penaltyVal === 2000) penalty = 'plus2'
                if (penaltyVal === -1) penalty = 'DNF'

                return {
                    id: uuidv4(),
                    scramble: scramble || '',
                    timeMs,
                    timestamp: timestampVal ? timestampVal * 1000 : Date.now(),
                    puzzleType: '3x3', // Default as we don't have metadata
                    penalty
                }
            })
            sessions.push({
                id: uuidv4(),
                name: `Imported csTimer ${key}`,
                puzzleType: '3x3',
                solves
            })
        }
      }
    })
    return sessions
  }

  // Case C: CubeDesk
  // Array of sessions? or object?
  // CubeDesk export usually: { sessions: [ { name: "...", solves: [...] } ] }

  if (json.sessions && Array.isArray(json.sessions)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json.sessions.forEach((s: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const solves = (s.solves || []).map((solve: any) => {
              // CubeDesk solve: { time: number (seconds), raw_time: number, penalty: 0/2/-1, scramble: string, created_at: string }
              let penalty: 'plus2' | 'DNF' | null = null
              if (solve.penalty === 2) penalty = 'plus2'
              if (solve.penalty === -1) penalty = 'DNF'
              
              return {
                  id: uuidv4(),
                  scramble: solve.scramble || '',
                  timeMs: (solve.raw_time || solve.time) * 1000,
                  timestamp: new Date(solve.created_at).getTime() || Date.now(),
                  puzzleType: '3x3', // CubeDesk has cube_type but we default for now
                  penalty
              }
          })
          sessions.push({
              id: uuidv4(),
              name: s.name || `Imported CubeDesk`,
              puzzleType: '3x3',
              solves
          })
      })
      return sessions
  }

  return sessions
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertExportSessionToInternal(exportSession: any, fileName: string): Session {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solves = (exportSession.solves || []).map((s: any) => mapExportToInternalSolve(s))
    return {
        id: uuidv4(),
        name: exportSession.name || `Imported Session (${fileName})`,
        puzzleType: '3x3', // Could infer from solves if we stored it
        solves
    }
}

function parseCSVImport(content: string, fileName: string): Session[] {
    const lines = content.split('\n').filter(l => l.trim())
    const header = lines[0].toLowerCase()
    const solves: SolveEntry[] = []

    // Detect format
    // Flowtimer: "time,scramble,penalty,date" (maybe)
    // Our CSV: "timeMs,rawTimeMs,penalty,scramble,timestamp"
    
    const isOurFormat = header.includes('timems')
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const parts = line.split(',') // Simple split, might break if scramble has commas
        
        if (isOurFormat) {
            const [, rawTimeMs, penaltyStr, scramble, timestamp] = parts
            let penalty: 'plus2' | 'DNF' | null = null
            if (penaltyStr === '+2') penalty = 'plus2'
            if (penaltyStr === 'DNF') penalty = 'DNF'
            
            solves.push({
                id: uuidv4(),
                scramble: scramble || '',
                timeMs: Number(rawTimeMs),
                timestamp: Number(timestamp) || Date.now(),
                puzzleType: '3x3',
                penalty
            })
        } else {
            // Generic / Flowtimer fallback
            // Assume: time, scramble, penalty, date?
            const timeVal = parseFloat(parts[0])
            const scramble = parts[1] || ''
            const penaltyStr = parts[2] || ''
            const dateStr = parts[3]
            
            let penalty: 'plus2' | 'DNF' | null = null
            let timeMs = timeVal * 1000 // Assume seconds if small? Or ms?
            // Heuristic: if time < 1000, probably seconds
            if (timeVal < 1000) timeMs = timeVal * 1000
            
            if (penaltyStr.includes('+2')) penalty = 'plus2'
            if (penaltyStr.includes('DNF')) penalty = 'DNF'
            
            let timestamp = Date.now()
            if (dateStr) {
                const parsed = Date.parse(dateStr)
                if (!isNaN(parsed)) timestamp = parsed
            }
            
            solves.push({
                id: uuidv4(),
                scramble,
                timeMs,
                timestamp,
                puzzleType: '3x3',
                penalty
            })
        }
    }

    return [{
        id: uuidv4(),
        name: `Imported CSV (${fileName})`,
        puzzleType: '3x3',
        solves
    }]
}

function parseTextImport(content: string, fileName: string): Session[] {
    const lines = content.split('\n').filter(l => l.trim())
    const solves: SolveEntry[] = []

    lines.forEach(line => {
        // "12.53" or "13.20 +2" or "DNF"
        line = line.trim()
        let penalty: 'plus2' | 'DNF' | null = null
        let timeMs = 0

        if (line.toUpperCase().includes('DNF')) {
            penalty = 'DNF'
            timeMs = 0
        } else {
            if (line.includes('+')) {
                penalty = 'plus2'
                line = line.replace('+', '').replace('2', '').trim()
            }
            const seconds = parseFloat(line)
            if (!isNaN(seconds)) {
                timeMs = seconds * 1000
            }
        }

        solves.push({
            id: uuidv4(),
            scramble: '', // No scramble in simple text
            timeMs,
            timestamp: Date.now(),
            puzzleType: '3x3',
            penalty
        })
    })

    return [{
        id: uuidv4(),
        name: `Imported Text (${fileName})`,
        puzzleType: '3x3',
        solves
    }]
}
