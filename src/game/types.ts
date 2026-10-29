export interface Footballer {
  id: string
  fullName: string
  surname: string
  puzzleWord: string
  clue: string
}

export type Direction = 'E' | 'W' | 'N' | 'S' | 'NE' | 'NW' | 'SE' | 'SW'
export interface Position { row: number; col: number }
export interface WordPlacement {
  footballerId: string
  word: string
  start: Position
  direction: Direction
  cells: Position[]
}
export interface WordSearchBoard {
  rows: number
  cols: number
  letters: string[][]
  placements: WordPlacement[]
}
export type GameStatus = 'setup' | 'playing' | 'finished'
export type TurnPhase = 'searching' | 'matching'
export type MatchEndReason = 'all-found' | 'time-limit' | 'last-survivor' | 'all-eliminated'
export type PlayerColor = 'blue' | 'red' | 'purple'
export interface PlayerState {
  id: string
  name: string
  color: PlayerColor
  score: number
  letterErrors: number
  eliminated: boolean
  foundFootballerIds: string[]
  correctlyMatchedIds: string[]
  failedMatchedIds: string[]
  board: WordSearchBoard
  footballers: Footballer[]
}
export interface MatchState {
  status: GameStatus
  players: PlayerState[]
  activePlayerIndex: number
  phase: TurnPhase
  currentRevealedFootballerId: string | null
  matchStartedAtMs: number | null
  matchDeadlineMs: number | null
  phaseDeadlineMs: number | null
  finishedAtMs: number | null
  endReason: MatchEndReason | null
  seed: number | null
  revision: number
  feedback: string
  feedbackKind: 'info' | 'success' | 'error' | 'elimination'
  lastWrongCell: (Position & { playerId: string; atMs: number; letter: string }) | null
}
