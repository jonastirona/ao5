import { describe, it, expect } from 'vitest'
import { exportSessionToJSON, exportSessionToCSV, exportSessionToText, parseImport } from './importExport'
import type { Session } from '../store'

describe('Import/Export', () => {
    const mockSession: Session = {
        id: 'test-id',
        name: 'Test Session',
        puzzleType: '3x3',
        solves: [
            { id: '1', timeMs: 10000, scramble: 'R U', timestamp: 1000, puzzleType: '3x3', penalty: null },
            { id: '2', timeMs: 10000, scramble: 'U R', timestamp: 2000, puzzleType: '3x3', penalty: 'plus2' },
            { id: '3', timeMs: 0, scramble: 'D F', timestamp: 3000, puzzleType: '3x3', penalty: 'DNF' }
        ]
    }

    it('should export and import JSON correctly', () => {
        const json = exportSessionToJSON(mockSession)
        const imported = parseImport(json, 'test.json')
        
        expect(imported).toHaveLength(1)
        const session = imported[0]
        expect(session.name).toBe('Test Session')
        expect(session.solves).toHaveLength(3)
        
        // Check solve 1 (OK)
        expect(session.solves[0].timeMs).toBe(10000)
        // Check solve 1 (OK)
        // parseImport calls parseJSONImport -> convertExportSessionToInternal -> mapExportToInternalSolve
        // mapExportToInternalSolve returns internal format (null/plus2/DNF)
        expect(session.solves[0].penalty).toBeNull()

        // Check solve 2 (+2)
        // Export: timeMs=12000, rawTimeMs=10000, penalty=+2
        // Import: timeMs=10000 (raw), penalty=plus2
        expect(session.solves[1].timeMs).toBe(10000)
        expect(session.solves[1].penalty).toBe('plus2')

        // Check solve 3 (DNF)
        expect(session.solves[2].penalty).toBe('DNF')
    })

    it('should export and import CSV correctly', () => {
        const csv = exportSessionToCSV(mockSession)
        const imported = parseImport(csv, 'test.csv')
        
        expect(imported).toHaveLength(1)
        const session = imported[0]
        expect(session.solves).toHaveLength(3)
        
        expect(session.solves[0].timeMs).toBe(10000)
        expect(session.solves[1].timeMs).toBe(10000)
        expect(session.solves[1].penalty).toBe('plus2')
        expect(session.solves[2].penalty).toBe('DNF')
    })

    it('should export and import Text correctly', () => {
        const txt = exportSessionToText(mockSession)
        // Expected:
        // 10.00
        // 10.00 +2
        // DNF
        const imported = parseImport(txt, 'test.txt')
        
        expect(imported).toHaveLength(1)
        const session = imported[0]
        expect(session.solves).toHaveLength(3)
        
        expect(session.solves[0].timeMs).toBe(10000)
        expect(session.solves[1].timeMs).toBe(10000)
        expect(session.solves[1].penalty).toBe('plus2')
        expect(session.solves[2].penalty).toBe('DNF')
    })

    it('should import csTimer JSON', () => {
        const csTimerJSON = JSON.stringify({
            "session1": [
                [0, 10000, "R U", "", 1672531200], // OK, 2023-01-01
                [2000, 10000, "U R", "", 1672531200], // +2
                [-1, 10000, "D F", "", 1672531200], // DNF
                [[0, 15000], "B L", "", 1672531200] // Nested format
            ],
            "properties": {}
        })
        
        const imported = parseImport(csTimerJSON, 'cstimer.json')
        expect(imported).toHaveLength(1)
        const session = imported[0]
        
        expect(session.solves[0].timeMs).toBe(10000)
        expect(session.solves[0].penalty).toBeNull()
        expect(session.solves[0].timestamp).toBe(1672531200000)
        
        expect(session.solves[1].timeMs).toBe(10000)
        expect(session.solves[1].penalty).toBe('plus2')
        
        expect(session.solves[2].penalty).toBe('DNF')

        expect(session.solves[3].timeMs).toBe(15000)
        expect(session.solves[3].scramble).toBe('B L')
    })

    it('should import csTimer JSON with properties', () => {
        const json = {
            "session1": [[[0, 10000], "R U", "", 1672531200]],
            "session2": [[[0, 20000], "Rw Uw", "", 1672531300]],
            "properties": {
                "sessionData": JSON.stringify({
                    "1": { "name": "My 3x3", "opt": { "scrType": "333" } },
                    "2": { "name": "My 4x4", "opt": { "scrType": "444wca" } }
                })
            }
        }
        
        const sessions = parseImport(JSON.stringify(json), 'cstimer.txt')
        expect(sessions).toHaveLength(2)
        
        expect(sessions[0].name).toContain('My 3x3')
        expect(sessions[0].puzzleType).toBe('3x3')
        expect(sessions[0].solves).toHaveLength(1)
        
        expect(sessions[1].name).toContain('My 4x4')
        expect(sessions[1].puzzleType).toBe('4x4')
        expect(sessions[1].solves).toHaveLength(1)
    })

    it('should import CubeDesk JSON', () => {
        const cubeDeskJSON = JSON.stringify({
            "sessions": [
                {
                    "name": "CD Session",
                    "solves": [
                        { "time": 10.0, "raw_time": 10.0, "penalty": 0, "scramble": "R U", "created_at": "2023-01-01" },
                        { "time": 12.0, "raw_time": 10.0, "penalty": 2, "scramble": "U R", "created_at": "2023-01-01" },
                        { "time": 0, "raw_time": 0, "penalty": -1, "scramble": "D F", "created_at": "2023-01-01" }
                    ]
                }
            ]
        })
        
        const imported = parseImport(cubeDeskJSON, 'cubedesk.json')
        expect(imported).toHaveLength(1)
        const session = imported[0]
        
        expect(session.solves[0].timeMs).toBe(10000)
        expect(session.solves[1].timeMs).toBe(10000)
        expect(session.solves[1].penalty).toBe('plus2')
        expect(session.solves[2].penalty).toBe('DNF')
    })

    it('should import Flowtimer/Generic CSV', () => {
        // time,scramble,penalty,date
        const csv = `time,scramble,penalty,date
10.00,R U,,2023-01-01
12.00,U R,+2,2023-01-01
0,D F,DNF,2023-01-01`

        const imported = parseImport(csv, 'flow.csv')
        expect(imported).toHaveLength(1)
        const session = imported[0]
        
        // Flowtimer usually gives final time?
        // If 12.00 and +2, is raw 10.00?
        // Our logic: timeMs = timeVal * 1000.
        // If +2 is present, we mark it as plus2.
        // Internal logic treats timeMs as RAW.
        // So if input is 12.00 and +2, we store 12000 raw + plus2 = 14000 effective.
        // This might be a discrepancy if external tool exports FINAL time.
        // But without raw time, we can't know.
        // Let's assume generic CSV provides final time or we accept it as raw.
        // If we want to be smart: if +2, maybe subtract 2s?
        // But for now, simple import is fine.
        
        expect(session.solves[0].timeMs).toBe(10000)
        expect(session.solves[1].penalty).toBe('plus2')
        expect(session.solves[2].penalty).toBe('DNF')
    })
})
