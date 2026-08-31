import { getEditionForWeek, getCurrentWeekIndex } from "./weeklyEngine";

export interface WeeklyGameData {
  weekIndex: number;
  wordleWord: string;
  globleTarget: string;
  timelineEvents: { id: string; content: string; year: number }[];
  connectionsGroups: { category: string; items: string[]; difficulty: number }[];
  sudokuBoard: number[][];
  hasEvent: boolean;
  secretClue: string | null;
}

// ----------------------------------------------------
// SUDOKU GENERATOR (Permutes a base valid grid)
// ----------------------------------------------------
const BASE_SUDOKU = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

function getSudokuVariation(week: number): number[][] {
  const newBoard = BASE_SUDOKU.map(row => [...row]);
  const shift = week % 9;
  if (shift === 0) return newBoard;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      let val = newBoard[r][c] + shift;
      if (val > 9) val -= 9;
      newBoard[r][c] = val;
    }
  }
  return newBoard;
}

// ----------------------------------------------------
// CONTENT POOLS (We loop through these seamlessly)
// ----------------------------------------------------
const WORDLE_WORDS = ["ALIBI", "MASCA", "CRIMA", "NOROC", "GLUMA", "ARTA", "MUZEU", "TABU", "CASTEL", "SECRET"];
const GLOBLE_TARGETS = ["ROU", "FRA", "DEU", "ITA", "GBR", "USA", "JPN", "BRA", "ESP", "CAN"];

const TIMELINE_SETS = [
  [
    { id: "t1", content: "Marea Unire de la Alba Iulia", year: 1918 },
    { id: "t2", content: "Căderea Zidului Berlinului", year: 1989 },
    { id: "t3", content: "Asasinarea lui JFK", year: 1963 },
    { id: "t4", content: "Aterizarea pe Lună", year: 1969 },
    { id: "t5", content: "Scufundarea Titanicului", year: 1912 },
  ],
  [
    { id: "t6", content: "Lansarea primului iPhone", year: 2007 },
    { id: "t7", content: "Crearea Google", year: 1998 },
    { id: "t8", content: "Lansarea Facebook", year: 2004 },
    { id: "t9", content: "Invenția World Wide Web (WWW)", year: 1989 },
    { id: "t10", content: "Fondarea Microsoft", year: 1975 },
  ],
  [
    { id: "t11", content: "Lansarea filmului Titanic", year: 1997 },
    { id: "t12", content: "Primul film Star Wars", year: 1977 },
    { id: "t13", content: "Lansarea The Matrix", year: 1999 },
    { id: "t14", content: "Primul film Harry Potter", year: 2001 },
    { id: "t15", content: "Avatar ajunge în cinematografe", year: 2009 },
  ]
];

const CONNECTIONS_SETS = [
  [
    { category: "Țări din America de Sud", items: ["BRAZILIA", "ARGENTINA", "CHILE", "PERU"], difficulty: 1 },
    { category: "Mărci de mașini", items: ["FORD", "TOYOTA", "HONDA", "BMW"], difficulty: 2 },
    { category: "Sinonime pentru a vorbi", items: ["A SPUNE", "A ROSTI", "A ZICE", "A DECLARA"], difficulty: 3 },
    { category: "Cuvinte care încep cu 'Z'", items: ["ZEBRĂ", "ZĂPADĂ", "ZMEU", "ZAR"], difficulty: 4 },
  ],
  [
    { category: "Elemente chimice", items: ["FIER", "AUR", "ARGINT", "CUPRU"], difficulty: 1 },
    { category: "Culori primare și secundare", items: ["ROȘU", "ALBASTRU", "VERDE", "GALBEN"], difficulty: 2 },
    { category: "Planete ale sistemului solar", items: ["MARTE", "JUPITER", "SATURN", "VENUS"], difficulty: 3 },
    { category: "Genuri muzicale", items: ["ROCK", "POP", "JAZZ", "BLUES"], difficulty: 4 },
  ]
];

// EXPORT FUNCTION
// ----------------------------------------------------
export function getWeeklyGameData(weekIndex: number): WeeklyGameData {
  const edition = getEditionForWeek(weekIndex);
  
  return {
    weekIndex,
    hasEvent: edition !== null,
    secretClue: edition ? edition.secretClue : null,
    wordleWord: WORDLE_WORDS[weekIndex % WORDLE_WORDS.length],
    globleTarget: GLOBLE_TARGETS[weekIndex % GLOBLE_TARGETS.length],
    timelineEvents: TIMELINE_SETS[weekIndex % TIMELINE_SETS.length],
    connectionsGroups: CONNECTIONS_SETS[weekIndex % CONNECTIONS_SETS.length],
    sudokuBoard: getSudokuVariation(weekIndex),
  };
}

export function getCurrentWeeklyGameData(): WeeklyGameData {
  return getWeeklyGameData(getCurrentWeekIndex());
}
