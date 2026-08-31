const fs = require('fs');

const words = [
  "MASCA", "ALIBI", "CRIMA", "NOROC", "GLUMA", "MUZEU", "TESTE", "PIESA", "FRICA", "CURAJ",
  "LUPTA", "EROUL", "TIGRU", "VIZOR", "TEREN", "DOSAR", "MINTE", "SOARE", "CARTE", "SPION",
  "BILET", "TRUPE", "REGIA", "ECRAN", "PISTA", "BARCA", "VAPOR", "AVION", "MINGE", "FINAL",
  "SCENA", "ACTOR", "LIDER", "MAGIC", "POKER", "ZARUR", "TABLA", "TURNE", "SPORT", "ATLET"
];

const countries = [
  "ROU", "FRA", "DEU", "ITA", "GBR", "USA", "JPN", "BRA", "ESP", "CAN",
  "AUS", "IND", "CHN", "ZAF", "MEX", "ARG", "COL", "PER", "CHL", "EGY",
  "MAR", "NGA", "KEN", "SAU", "TUR", "GRC", "SWE", "NOR", "FIN", "POL",
  "UKR", "THA", "VNM", "KOR", "IDN", "NZL", "CUB", "JAM", "ISL", "IRL"
];

// Timeline master events
const roEvents = [
  { content: "Marea Unire de la Alba Iulia", year: 1918 },
  { content: "Mica Unire (Unirea Principatelor Române)", year: 1859 },
  { content: "Revoluția Română", year: 1989 },
  { content: "Intrarea României în Uniunea Europeană", year: 2007 },
  { content: "Răscoala lui Horea, Cloșca și Crișan", year: 1784 },
  { content: "Tudor Vladimirescu și Revoluția", year: 1821 },
  { content: "Independența României", year: 1877 },
  { content: "Nadia Comăneci obține prima notă de 10", year: 1976 },
  { content: "Intrarea României în NATO", year: 2004 },
  { content: "Bătălia de la Călugăreni", year: 1595 }
];

const techEvents = [
  { content: "Aterizarea pe Lună (Apollo 11)", year: 1969 },
  { content: "Lansarea primului iPhone", year: 2007 },
  { content: "Crearea Google", year: 1998 },
  { content: "Invenția World Wide Web (WWW)", year: 1989 },
  { content: "Fondarea Microsoft", year: 1975 },
  { content: "Descoperirea penicilinei", year: 1928 },
  { content: "Primul zbor al fraților Wright", year: 1903 },
  { content: "Primul zbor în spațiu (Iuri Gagarin)", year: 1961 },
  { content: "Lansarea primului satelit artificial (Sputnik)", year: 1957 },
  { content: "Dezvelirea primului computer personal IBM", year: 1981 }
];

const globalEvents = [
  { content: "Căderea Zidului Berlinului", year: 1989 },
  { content: "Asasinarea lui JFK", year: 1963 },
  { content: "Scufundarea Titanicului", year: 1912 },
  { content: "Sfârșitul Primului Război Mondial", year: 1918 },
  { content: "Atentatele din 11 septembrie", year: 2001 },
  { content: "Descoperirea Americii de Cristofor Columb", year: 1492 },
  { content: "Începutul Revoluției Franceze", year: 1789 },
  { content: "Asasinarea Arhiducelui Franz Ferdinand", year: 1914 },
  { content: "Sfârșitul celui de-Al Doilea Război Mondial", year: 1945 },
  { content: "Tratatul de la Versailles", year: 1919 }
];

const popEvents = [
  { content: "Lansarea primului film Star Wars", year: 1977 },
  { content: "Lansarea filmului The Matrix", year: 1999 },
  { content: "Primul film Harry Potter", year: 2001 },
  { content: "Avatar ajunge în cinematografe", year: 2009 },
  { content: "Lansarea Facebook", year: 2004 },
  { content: "Prima ediție a premiilor Oscar", year: 1929 },
  { content: "Lansarea consolei PlayStation 1", year: 1994 },
  { content: "Debutul serialului The Simpsons", year: 1989 },
  { content: "Michael Jackson lansează albumul Thriller", year: 1982 },
  { content: "Lansarea filmului Titanic", year: 1997 }
];

// Generate 40 Timeline sets by taking 1 from each category + 1 random
let timelineSets = [];
for (let i = 0; i < 40; i++) {
  let ro = roEvents[i % roEvents.length];
  let tech = techEvents[(i + 3) % techEvents.length];
  let glob = globalEvents[(i + 7) % globalEvents.length];
  let pop = popEvents[(i + 5) % popEvents.length];
  
  // A 5th random event to make it 5 items
  let extraPool = [...roEvents, ...techEvents, ...globalEvents, ...popEvents];
  let extra = extraPool[(i * 13) % extraPool.length];
  while([ro, tech, glob, pop].includes(extra)) {
    extra = extraPool[(i * 13 + Math.floor(Math.random()*10)) % extraPool.length];
  }
  
  let set = [
    { id: `t${i}_1`, content: ro.content, year: ro.year },
    { id: `t${i}_2`, content: tech.content, year: tech.year },
    { id: `t${i}_3`, content: glob.content, year: glob.year },
    { id: `t${i}_4`, content: pop.content, year: pop.year },
    { id: `t${i}_5`, content: extra.content, year: extra.year },
  ];
  timelineSets.push(set);
}

// Write the template
let output = `import { getEditionForWeek, getCurrentWeekIndex } from "./weeklyEngine";

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
// SUDOKU GENERATOR (Seed-based permutation)
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

// Generates an infinitely unique Sudoku board by mathematically permuting the numbers
function getSudokuVariation(week: number): number[][] {
  const newBoard = BASE_SUDOKU.map(row => [...row]);
  
  // Seeded random number mapper (1-9)
  const map = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = map.length - 1; i > 0; i--) {
    const j = (week * (i + 7) + 13) % (i + 1);
    [map[i], map[j]] = [map[j], map[i]];
  }
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      newBoard[r][c] = map[newBoard[r][c] - 1];
    }
  }
  return newBoard;
}

// ----------------------------------------------------
// CONTENT POOLS (40 Weeks Unique)
// ----------------------------------------------------
const WORDLE_WORDS = ${JSON.stringify(words, null, 2)};

const GLOBLE_TARGETS = ${JSON.stringify(countries, null, 2)};

const TIMELINE_SETS = ${JSON.stringify(timelineSets, null, 2)};
`;

fs.writeFileSync('client/src/lib/weeklyGames_temp.ts', output);
const baseGroups = [
  { category: "Țări din America de Sud", items: ["BRAZILIA", "ARGENTINA", "CHILE", "PERU"], difficulty: 1 },
  { category: "Mărci de mașini", items: ["FORD", "TOYOTA", "HONDA", "BMW"], difficulty: 2 },
  { category: "Sinonime pentru a vorbi", items: ["A SPUNE", "A ROSTI", "A ZICE", "A DECLARA"], difficulty: 3 },
  { category: "Cuvinte care încep cu 'Z'", items: ["ZEBRĂ", "ZĂPADĂ", "ZMEU", "ZAR"], difficulty: 4 },
  { category: "Elemente chimice", items: ["FIER", "AUR", "ARGINT", "CUPRU"], difficulty: 1 },
  { category: "Culori primare și secundare", items: ["ROȘU", "ALBASTRU", "VERDE", "GALBEN"], difficulty: 2 },
  { category: "Planete", items: ["MARTE", "JUPITER", "SATURN", "VENUS"], difficulty: 3 },
  { category: "Genuri muzicale", items: ["ROCK", "POP", "JAZZ", "BLUES"], difficulty: 4 },
  { category: "Capitale europene", items: ["PARIS", "BERLIN", "MADRID", "ROMA"], difficulty: 1 },
  { category: "Fructe de pădure", items: ["ZMEURĂ", "MURĂ", "AFINĂ", "FRAGĂ"], difficulty: 2 },
  { category: "Animale de companie", items: ["CÂINE", "PISICĂ", "PAPAGAL", "HAMSTER"], difficulty: 3 },
  { category: "Instrumente cu coarde", items: ["VIOARĂ", "CHITARĂ", "VIOLONCEL", "HARPĂ"], difficulty: 4 },
  { category: "Zodii de foc", items: ["BERBEC", "LEU", "SĂGETĂTOR", "OFIUCUS (GLUMĂ)"], difficulty: 1 },
  { category: "Anotimpuri", items: ["PRIMĂVARĂ", "VARĂ", "TOAMNĂ", "IARNĂ"], difficulty: 2 },
  { category: "Cărți de joc", items: ["TREFLĂ", "ROMB", "INIMĂ NEAGRĂ", "INIMĂ ROȘIE"], difficulty: 3 },
  { category: "Mari scriitori români", items: ["EMINESCU", "CREANGĂ", "CARAGIALE", "SLAVICI"], difficulty: 4 },
  { category: "Mări ale lumii", items: ["MAREA NEAGRĂ", "MAREA ROȘIE", "MAREA MOARTĂ", "MAREA MEDITERANĂ"], difficulty: 1 },
  { category: "Sporturi cu mingea", items: ["FOTBAL", "BASCHET", "TENIS", "VOLEI"], difficulty: 2 },
  { category: "Limbi romanice", items: ["ROMÂNĂ", "ITALIANĂ", "SPANIOLĂ", "FRANCEZĂ"], difficulty: 3 },
  { category: "Zei greci", items: ["ZEUS", "APOLLO", "ARES", "POSEIDON"], difficulty: 4 },
];

let connectionsSets = [];
for (let i = 0; i < 40; i++) {
  connectionsSets.push([
    baseGroups[(i * 3 + 0) % baseGroups.length],
    baseGroups[(i * 3 + 5) % baseGroups.length],
    baseGroups[(i * 3 + 11) % baseGroups.length],
    baseGroups[(i * 3 + 17) % baseGroups.length],
  ]);
}

let extraData = `
const CONNECTIONS_SETS = ${JSON.stringify(connectionsSets, null, 2)};

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
`;

fs.appendFileSync('client/src/lib/weeklyGames_temp.ts', extraData);
