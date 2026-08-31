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
const WORDLE_WORDS = [
  "MASCA",
  "ALIBI",
  "CRIMA",
  "NOROC",
  "GLUMA",
  "MUZEU",
  "TESTE",
  "PIESA",
  "FRICA",
  "CURAJ",
  "LUPTA",
  "EROUL",
  "TIGRU",
  "VIZOR",
  "TEREN",
  "DOSAR",
  "MINTE",
  "SOARE",
  "CARTE",
  "SPION",
  "BILET",
  "TRUPE",
  "REGIA",
  "ECRAN",
  "PISTA",
  "BARCA",
  "VAPOR",
  "AVION",
  "MINGE",
  "FINAL",
  "SCENA",
  "ACTOR",
  "LIDER",
  "MAGIC",
  "POKER",
  "ZARUR",
  "TABLA",
  "TURNE",
  "SPORT",
  "ATLET"
];

const GLOBLE_TARGETS = [
  "ROU",
  "FRA",
  "DEU",
  "ITA",
  "GBR",
  "USA",
  "JPN",
  "BRA",
  "ESP",
  "CAN",
  "AUS",
  "IND",
  "CHN",
  "ZAF",
  "MEX",
  "ARG",
  "COL",
  "PER",
  "CHL",
  "EGY",
  "MAR",
  "NGA",
  "KEN",
  "SAU",
  "TUR",
  "GRC",
  "SWE",
  "NOR",
  "FIN",
  "POL",
  "UKR",
  "THA",
  "VNM",
  "KOR",
  "IDN",
  "NZL",
  "CUB",
  "JAM",
  "ISL",
  "IRL"
];

const TIMELINE_SETS = [
  [
    {
      "id": "t0_1",
      "content": "Marea Unire de la Alba Iulia",
      "year": 1918
    },
    {
      "id": "t0_2",
      "content": "Invenția World Wide Web (WWW)",
      "year": 1989
    },
    {
      "id": "t0_3",
      "content": "Asasinarea Arhiducelui Franz Ferdinand",
      "year": 1914
    },
    {
      "id": "t0_4",
      "content": "Prima ediție a premiilor Oscar",
      "year": 1929
    },
    {
      "id": "t0_5",
      "content": "Tudor Vladimirescu și Revoluția",
      "year": 1821
    }
  ],
  [
    {
      "id": "t1_1",
      "content": "Mica Unire (Unirea Principatelor Române)",
      "year": 1859
    },
    {
      "id": "t1_2",
      "content": "Fondarea Microsoft",
      "year": 1975
    },
    {
      "id": "t1_3",
      "content": "Sfârșitul celui de-Al Doilea Război Mondial",
      "year": 1945
    },
    {
      "id": "t1_4",
      "content": "Lansarea consolei PlayStation 1",
      "year": 1994
    },
    {
      "id": "t1_5",
      "content": "Invenția World Wide Web (WWW)",
      "year": 1989
    }
  ],
  [
    {
      "id": "t2_1",
      "content": "Revoluția Română",
      "year": 1989
    },
    {
      "id": "t2_2",
      "content": "Descoperirea penicilinei",
      "year": 1928
    },
    {
      "id": "t2_3",
      "content": "Tratatul de la Versailles",
      "year": 1919
    },
    {
      "id": "t2_4",
      "content": "Debutul serialului The Simpsons",
      "year": 1989
    },
    {
      "id": "t2_5",
      "content": "Începutul Revoluției Franceze",
      "year": 1789
    }
  ],
  [
    {
      "id": "t3_1",
      "content": "Intrarea României în Uniunea Europeană",
      "year": 2007
    },
    {
      "id": "t3_2",
      "content": "Primul zbor al fraților Wright",
      "year": 1903
    },
    {
      "id": "t3_3",
      "content": "Căderea Zidului Berlinului",
      "year": 1989
    },
    {
      "id": "t3_4",
      "content": "Michael Jackson lansează albumul Thriller",
      "year": 1982
    },
    {
      "id": "t3_5",
      "content": "Lansarea filmului Titanic",
      "year": 1997
    }
  ],
  [
    {
      "id": "t4_1",
      "content": "Răscoala lui Horea, Cloșca și Crișan",
      "year": 1784
    },
    {
      "id": "t4_2",
      "content": "Primul zbor în spațiu (Iuri Gagarin)",
      "year": 1961
    },
    {
      "id": "t4_3",
      "content": "Asasinarea lui JFK",
      "year": 1963
    },
    {
      "id": "t4_4",
      "content": "Lansarea filmului Titanic",
      "year": 1997
    },
    {
      "id": "t4_5",
      "content": "Crearea Google",
      "year": 1998
    }
  ],
  [
    {
      "id": "t5_1",
      "content": "Tudor Vladimirescu și Revoluția",
      "year": 1821
    },
    {
      "id": "t5_2",
      "content": "Lansarea primului satelit artificial (Sputnik)",
      "year": 1957
    },
    {
      "id": "t5_3",
      "content": "Scufundarea Titanicului",
      "year": 1912
    },
    {
      "id": "t5_4",
      "content": "Lansarea primului film Star Wars",
      "year": 1977
    },
    {
      "id": "t5_5",
      "content": "Descoperirea Americii de Cristofor Columb",
      "year": 1492
    }
  ],
  [
    {
      "id": "t6_1",
      "content": "Independența României",
      "year": 1877
    },
    {
      "id": "t6_2",
      "content": "Dezvelirea primului computer personal IBM",
      "year": 1981
    },
    {
      "id": "t6_3",
      "content": "Sfârșitul Primului Război Mondial",
      "year": 1918
    },
    {
      "id": "t6_4",
      "content": "Lansarea filmului The Matrix",
      "year": 1999
    },
    {
      "id": "t6_5",
      "content": "Michael Jackson lansează albumul Thriller",
      "year": 1982
    }
  ],
  [
    {
      "id": "t7_1",
      "content": "Nadia Comăneci obține prima notă de 10",
      "year": 1976
    },
    {
      "id": "t7_2",
      "content": "Aterizarea pe Lună (Apollo 11)",
      "year": 1969
    },
    {
      "id": "t7_3",
      "content": "Atentatele din 11 septembrie",
      "year": 2001
    },
    {
      "id": "t7_4",
      "content": "Primul film Harry Potter",
      "year": 2001
    },
    {
      "id": "t7_5",
      "content": "Lansarea primului iPhone",
      "year": 2007
    }
  ],
  [
    {
      "id": "t8_1",
      "content": "Intrarea României în NATO",
      "year": 2004
    },
    {
      "id": "t8_2",
      "content": "Lansarea primului iPhone",
      "year": 2007
    },
    {
      "id": "t8_3",
      "content": "Descoperirea Americii de Cristofor Columb",
      "year": 1492
    },
    {
      "id": "t8_4",
      "content": "Avatar ajunge în cinematografe",
      "year": 2009
    },
    {
      "id": "t8_5",
      "content": "Atentatele din 11 septembrie",
      "year": 2001
    }
  ],
  [
    {
      "id": "t9_1",
      "content": "Bătălia de la Călugăreni",
      "year": 1595
    },
    {
      "id": "t9_2",
      "content": "Crearea Google",
      "year": 1998
    },
    {
      "id": "t9_3",
      "content": "Începutul Revoluției Franceze",
      "year": 1789
    },
    {
      "id": "t9_4",
      "content": "Lansarea Facebook",
      "year": 2004
    },
    {
      "id": "t9_5",
      "content": "Debutul serialului The Simpsons",
      "year": 1989
    }
  ],
  [
    {
      "id": "t10_1",
      "content": "Marea Unire de la Alba Iulia",
      "year": 1918
    },
    {
      "id": "t10_2",
      "content": "Invenția World Wide Web (WWW)",
      "year": 1989
    },
    {
      "id": "t10_3",
      "content": "Asasinarea Arhiducelui Franz Ferdinand",
      "year": 1914
    },
    {
      "id": "t10_4",
      "content": "Prima ediție a premiilor Oscar",
      "year": 1929
    },
    {
      "id": "t10_5",
      "content": "Aterizarea pe Lună (Apollo 11)",
      "year": 1969
    }
  ],
  [
    {
      "id": "t11_1",
      "content": "Mica Unire (Unirea Principatelor Române)",
      "year": 1859
    },
    {
      "id": "t11_2",
      "content": "Fondarea Microsoft",
      "year": 1975
    },
    {
      "id": "t11_3",
      "content": "Sfârșitul celui de-Al Doilea Război Mondial",
      "year": 1945
    },
    {
      "id": "t11_4",
      "content": "Lansarea consolei PlayStation 1",
      "year": 1994
    },
    {
      "id": "t11_5",
      "content": "Sfârșitul Primului Război Mondial",
      "year": 1918
    }
  ],
  [
    {
      "id": "t12_1",
      "content": "Revoluția Română",
      "year": 1989
    },
    {
      "id": "t12_2",
      "content": "Descoperirea penicilinei",
      "year": 1928
    },
    {
      "id": "t12_3",
      "content": "Tratatul de la Versailles",
      "year": 1919
    },
    {
      "id": "t12_4",
      "content": "Debutul serialului The Simpsons",
      "year": 1989
    },
    {
      "id": "t12_5",
      "content": "Lansarea consolei PlayStation 1",
      "year": 1994
    }
  ],
  [
    {
      "id": "t13_1",
      "content": "Intrarea României în Uniunea Europeană",
      "year": 2007
    },
    {
      "id": "t13_2",
      "content": "Primul zbor al fraților Wright",
      "year": 1903
    },
    {
      "id": "t13_3",
      "content": "Căderea Zidului Berlinului",
      "year": 1989
    },
    {
      "id": "t13_4",
      "content": "Michael Jackson lansează albumul Thriller",
      "year": 1982
    },
    {
      "id": "t13_5",
      "content": "Bătălia de la Călugăreni",
      "year": 1595
    }
  ],
  [
    {
      "id": "t14_1",
      "content": "Răscoala lui Horea, Cloșca și Crișan",
      "year": 1784
    },
    {
      "id": "t14_2",
      "content": "Primul zbor în spațiu (Iuri Gagarin)",
      "year": 1961
    },
    {
      "id": "t14_3",
      "content": "Asasinarea lui JFK",
      "year": 1963
    },
    {
      "id": "t14_4",
      "content": "Lansarea filmului Titanic",
      "year": 1997
    },
    {
      "id": "t14_5",
      "content": "Scufundarea Titanicului",
      "year": 1912
    }
  ],
  [
    {
      "id": "t15_1",
      "content": "Tudor Vladimirescu și Revoluția",
      "year": 1821
    },
    {
      "id": "t15_2",
      "content": "Lansarea primului satelit artificial (Sputnik)",
      "year": 1957
    },
    {
      "id": "t15_3",
      "content": "Scufundarea Titanicului",
      "year": 1912
    },
    {
      "id": "t15_4",
      "content": "Lansarea primului film Star Wars",
      "year": 1977
    },
    {
      "id": "t15_5",
      "content": "Prima ediție a premiilor Oscar",
      "year": 1929
    }
  ],
  [
    {
      "id": "t16_1",
      "content": "Independența României",
      "year": 1877
    },
    {
      "id": "t16_2",
      "content": "Dezvelirea primului computer personal IBM",
      "year": 1981
    },
    {
      "id": "t16_3",
      "content": "Sfârșitul Primului Război Mondial",
      "year": 1918
    },
    {
      "id": "t16_4",
      "content": "Lansarea filmului The Matrix",
      "year": 1999
    },
    {
      "id": "t16_5",
      "content": "Intrarea României în NATO",
      "year": 2004
    }
  ],
  [
    {
      "id": "t17_1",
      "content": "Nadia Comăneci obține prima notă de 10",
      "year": 1976
    },
    {
      "id": "t17_2",
      "content": "Aterizarea pe Lună (Apollo 11)",
      "year": 1969
    },
    {
      "id": "t17_3",
      "content": "Atentatele din 11 septembrie",
      "year": 2001
    },
    {
      "id": "t17_4",
      "content": "Primul film Harry Potter",
      "year": 2001
    },
    {
      "id": "t17_5",
      "content": "Asasinarea lui JFK",
      "year": 1963
    }
  ],
  [
    {
      "id": "t18_1",
      "content": "Intrarea României în NATO",
      "year": 2004
    },
    {
      "id": "t18_2",
      "content": "Lansarea primului iPhone",
      "year": 2007
    },
    {
      "id": "t18_3",
      "content": "Descoperirea Americii de Cristofor Columb",
      "year": 1492
    },
    {
      "id": "t18_4",
      "content": "Avatar ajunge în cinematografe",
      "year": 2009
    },
    {
      "id": "t18_5",
      "content": "Lansarea Facebook",
      "year": 2004
    }
  ],
  [
    {
      "id": "t19_1",
      "content": "Bătălia de la Călugăreni",
      "year": 1595
    },
    {
      "id": "t19_2",
      "content": "Crearea Google",
      "year": 1998
    },
    {
      "id": "t19_3",
      "content": "Începutul Revoluției Franceze",
      "year": 1789
    },
    {
      "id": "t19_4",
      "content": "Lansarea Facebook",
      "year": 2004
    },
    {
      "id": "t19_5",
      "content": "Nadia Comăneci obține prima notă de 10",
      "year": 1976
    }
  ],
  [
    {
      "id": "t20_1",
      "content": "Marea Unire de la Alba Iulia",
      "year": 1918
    },
    {
      "id": "t20_2",
      "content": "Invenția World Wide Web (WWW)",
      "year": 1989
    },
    {
      "id": "t20_3",
      "content": "Asasinarea Arhiducelui Franz Ferdinand",
      "year": 1914
    },
    {
      "id": "t20_4",
      "content": "Prima ediție a premiilor Oscar",
      "year": 1929
    },
    {
      "id": "t20_5",
      "content": "Căderea Zidului Berlinului",
      "year": 1989
    }
  ],
  [
    {
      "id": "t21_1",
      "content": "Mica Unire (Unirea Principatelor Române)",
      "year": 1859
    },
    {
      "id": "t21_2",
      "content": "Fondarea Microsoft",
      "year": 1975
    },
    {
      "id": "t21_3",
      "content": "Sfârșitul celui de-Al Doilea Război Mondial",
      "year": 1945
    },
    {
      "id": "t21_4",
      "content": "Lansarea consolei PlayStation 1",
      "year": 1994
    },
    {
      "id": "t21_5",
      "content": "Avatar ajunge în cinematografe",
      "year": 2009
    }
  ],
  [
    {
      "id": "t22_1",
      "content": "Revoluția Română",
      "year": 1989
    },
    {
      "id": "t22_2",
      "content": "Descoperirea penicilinei",
      "year": 1928
    },
    {
      "id": "t22_3",
      "content": "Tratatul de la Versailles",
      "year": 1919
    },
    {
      "id": "t22_4",
      "content": "Debutul serialului The Simpsons",
      "year": 1989
    },
    {
      "id": "t22_5",
      "content": "Independența României",
      "year": 1877
    }
  ],
  [
    {
      "id": "t23_1",
      "content": "Intrarea României în Uniunea Europeană",
      "year": 2007
    },
    {
      "id": "t23_2",
      "content": "Primul zbor al fraților Wright",
      "year": 1903
    },
    {
      "id": "t23_3",
      "content": "Căderea Zidului Berlinului",
      "year": 1989
    },
    {
      "id": "t23_4",
      "content": "Michael Jackson lansează albumul Thriller",
      "year": 1982
    },
    {
      "id": "t23_5",
      "content": "Dezvelirea primului computer personal IBM",
      "year": 1981
    }
  ],
  [
    {
      "id": "t24_1",
      "content": "Răscoala lui Horea, Cloșca și Crișan",
      "year": 1784
    },
    {
      "id": "t24_2",
      "content": "Primul zbor în spațiu (Iuri Gagarin)",
      "year": 1961
    },
    {
      "id": "t24_3",
      "content": "Asasinarea lui JFK",
      "year": 1963
    },
    {
      "id": "t24_4",
      "content": "Lansarea filmului Titanic",
      "year": 1997
    },
    {
      "id": "t24_5",
      "content": "Primul film Harry Potter",
      "year": 2001
    }
  ],
  [
    {
      "id": "t25_1",
      "content": "Tudor Vladimirescu și Revoluția",
      "year": 1821
    },
    {
      "id": "t25_2",
      "content": "Lansarea primului satelit artificial (Sputnik)",
      "year": 1957
    },
    {
      "id": "t25_3",
      "content": "Scufundarea Titanicului",
      "year": 1912
    },
    {
      "id": "t25_4",
      "content": "Lansarea primului film Star Wars",
      "year": 1977
    },
    {
      "id": "t25_5",
      "content": "Invenția World Wide Web (WWW)",
      "year": 1989
    }
  ],
  [
    {
      "id": "t26_1",
      "content": "Independența României",
      "year": 1877
    },
    {
      "id": "t26_2",
      "content": "Dezvelirea primului computer personal IBM",
      "year": 1981
    },
    {
      "id": "t26_3",
      "content": "Sfârșitul Primului Război Mondial",
      "year": 1918
    },
    {
      "id": "t26_4",
      "content": "Lansarea filmului The Matrix",
      "year": 1999
    },
    {
      "id": "t26_5",
      "content": "Lansarea primului satelit artificial (Sputnik)",
      "year": 1957
    }
  ],
  [
    {
      "id": "t27_1",
      "content": "Nadia Comăneci obține prima notă de 10",
      "year": 1976
    },
    {
      "id": "t27_2",
      "content": "Aterizarea pe Lună (Apollo 11)",
      "year": 1969
    },
    {
      "id": "t27_3",
      "content": "Atentatele din 11 septembrie",
      "year": 2001
    },
    {
      "id": "t27_4",
      "content": "Primul film Harry Potter",
      "year": 2001
    },
    {
      "id": "t27_5",
      "content": "Lansarea filmului The Matrix",
      "year": 1999
    }
  ],
  [
    {
      "id": "t28_1",
      "content": "Intrarea României în NATO",
      "year": 2004
    },
    {
      "id": "t28_2",
      "content": "Lansarea primului iPhone",
      "year": 2007
    },
    {
      "id": "t28_3",
      "content": "Descoperirea Americii de Cristofor Columb",
      "year": 1492
    },
    {
      "id": "t28_4",
      "content": "Avatar ajunge în cinematografe",
      "year": 2009
    },
    {
      "id": "t28_5",
      "content": "Răscoala lui Horea, Cloșca și Crișan",
      "year": 1784
    }
  ],
  [
    {
      "id": "t29_1",
      "content": "Bătălia de la Călugăreni",
      "year": 1595
    },
    {
      "id": "t29_2",
      "content": "Crearea Google",
      "year": 1998
    },
    {
      "id": "t29_3",
      "content": "Începutul Revoluției Franceze",
      "year": 1789
    },
    {
      "id": "t29_4",
      "content": "Lansarea Facebook",
      "year": 2004
    },
    {
      "id": "t29_5",
      "content": "Primul zbor în spațiu (Iuri Gagarin)",
      "year": 1961
    }
  ],
  [
    {
      "id": "t30_1",
      "content": "Marea Unire de la Alba Iulia",
      "year": 1918
    },
    {
      "id": "t30_2",
      "content": "Invenția World Wide Web (WWW)",
      "year": 1989
    },
    {
      "id": "t30_3",
      "content": "Asasinarea Arhiducelui Franz Ferdinand",
      "year": 1914
    },
    {
      "id": "t30_4",
      "content": "Prima ediție a premiilor Oscar",
      "year": 1929
    },
    {
      "id": "t30_5",
      "content": "Lansarea primului film Star Wars",
      "year": 1977
    }
  ],
  [
    {
      "id": "t31_1",
      "content": "Mica Unire (Unirea Principatelor Române)",
      "year": 1859
    },
    {
      "id": "t31_2",
      "content": "Fondarea Microsoft",
      "year": 1975
    },
    {
      "id": "t31_3",
      "content": "Sfârșitul celui de-Al Doilea Război Mondial",
      "year": 1945
    },
    {
      "id": "t31_4",
      "content": "Lansarea consolei PlayStation 1",
      "year": 1994
    },
    {
      "id": "t31_5",
      "content": "Intrarea României în Uniunea Europeană",
      "year": 2007
    }
  ],
  [
    {
      "id": "t32_1",
      "content": "Revoluția Română",
      "year": 1989
    },
    {
      "id": "t32_2",
      "content": "Descoperirea penicilinei",
      "year": 1928
    },
    {
      "id": "t32_3",
      "content": "Tratatul de la Versailles",
      "year": 1919
    },
    {
      "id": "t32_4",
      "content": "Debutul serialului The Simpsons",
      "year": 1989
    },
    {
      "id": "t32_5",
      "content": "Primul zbor al fraților Wright",
      "year": 1903
    }
  ],
  [
    {
      "id": "t33_1",
      "content": "Intrarea României în Uniunea Europeană",
      "year": 2007
    },
    {
      "id": "t33_2",
      "content": "Primul zbor al fraților Wright",
      "year": 1903
    },
    {
      "id": "t33_3",
      "content": "Căderea Zidului Berlinului",
      "year": 1989
    },
    {
      "id": "t33_4",
      "content": "Michael Jackson lansează albumul Thriller",
      "year": 1982
    },
    {
      "id": "t33_5",
      "content": "Tratatul de la Versailles",
      "year": 1919
    }
  ],
  [
    {
      "id": "t34_1",
      "content": "Răscoala lui Horea, Cloșca și Crișan",
      "year": 1784
    },
    {
      "id": "t34_2",
      "content": "Primul zbor în spațiu (Iuri Gagarin)",
      "year": 1961
    },
    {
      "id": "t34_3",
      "content": "Asasinarea lui JFK",
      "year": 1963
    },
    {
      "id": "t34_4",
      "content": "Lansarea filmului Titanic",
      "year": 1997
    },
    {
      "id": "t34_5",
      "content": "Revoluția Română",
      "year": 1989
    }
  ],
  [
    {
      "id": "t35_1",
      "content": "Tudor Vladimirescu și Revoluția",
      "year": 1821
    },
    {
      "id": "t35_2",
      "content": "Lansarea primului satelit artificial (Sputnik)",
      "year": 1957
    },
    {
      "id": "t35_3",
      "content": "Scufundarea Titanicului",
      "year": 1912
    },
    {
      "id": "t35_4",
      "content": "Lansarea primului film Star Wars",
      "year": 1977
    },
    {
      "id": "t35_5",
      "content": "Descoperirea penicilinei",
      "year": 1928
    }
  ],
  [
    {
      "id": "t36_1",
      "content": "Independența României",
      "year": 1877
    },
    {
      "id": "t36_2",
      "content": "Dezvelirea primului computer personal IBM",
      "year": 1981
    },
    {
      "id": "t36_3",
      "content": "Sfârșitul Primului Război Mondial",
      "year": 1918
    },
    {
      "id": "t36_4",
      "content": "Lansarea filmului The Matrix",
      "year": 1999
    },
    {
      "id": "t36_5",
      "content": "Sfârșitul celui de-Al Doilea Război Mondial",
      "year": 1945
    }
  ],
  [
    {
      "id": "t37_1",
      "content": "Nadia Comăneci obține prima notă de 10",
      "year": 1976
    },
    {
      "id": "t37_2",
      "content": "Aterizarea pe Lună (Apollo 11)",
      "year": 1969
    },
    {
      "id": "t37_3",
      "content": "Atentatele din 11 septembrie",
      "year": 2001
    },
    {
      "id": "t37_4",
      "content": "Primul film Harry Potter",
      "year": 2001
    },
    {
      "id": "t37_5",
      "content": "Mica Unire (Unirea Principatelor Române)",
      "year": 1859
    }
  ],
  [
    {
      "id": "t38_1",
      "content": "Intrarea României în NATO",
      "year": 2004
    },
    {
      "id": "t38_2",
      "content": "Lansarea primului iPhone",
      "year": 2007
    },
    {
      "id": "t38_3",
      "content": "Descoperirea Americii de Cristofor Columb",
      "year": 1492
    },
    {
      "id": "t38_4",
      "content": "Avatar ajunge în cinematografe",
      "year": 2009
    },
    {
      "id": "t38_5",
      "content": "Fondarea Microsoft",
      "year": 1975
    }
  ],
  [
    {
      "id": "t39_1",
      "content": "Bătălia de la Călugăreni",
      "year": 1595
    },
    {
      "id": "t39_2",
      "content": "Crearea Google",
      "year": 1998
    },
    {
      "id": "t39_3",
      "content": "Începutul Revoluției Franceze",
      "year": 1789
    },
    {
      "id": "t39_4",
      "content": "Lansarea Facebook",
      "year": 2004
    },
    {
      "id": "t39_5",
      "content": "Asasinarea Arhiducelui Franz Ferdinand",
      "year": 1914
    }
  ]
];

const CONNECTIONS_SETS = [
  [
    {
      "category": "Țări din America de Sud",
      "items": [
        "BRAZILIA",
        "ARGENTINA",
        "CHILE",
        "PERU"
      ],
      "difficulty": 1
    },
    {
      "category": "Culori primare și secundare",
      "items": [
        "ROȘU",
        "ALBASTRU",
        "VERDE",
        "GALBEN"
      ],
      "difficulty": 2
    },
    {
      "category": "Instrumente cu coarde",
      "items": [
        "VIOARĂ",
        "CHITARĂ",
        "VIOLONCEL",
        "HARPĂ"
      ],
      "difficulty": 4
    },
    {
      "category": "Sporturi cu mingea",
      "items": [
        "FOTBAL",
        "BASCHET",
        "TENIS",
        "VOLEI"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Cuvinte care încep cu 'Z'",
      "items": [
        "ZEBRĂ",
        "ZĂPADĂ",
        "ZMEU",
        "ZAR"
      ],
      "difficulty": 4
    },
    {
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "MADRID",
        "ROMA"
      ],
      "difficulty": 1
    },
    {
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ NEAGRĂ",
        "INIMĂ ROȘIE"
      ],
      "difficulty": 3
    },
    {
      "category": "Țări din America de Sud",
      "items": [
        "BRAZILIA",
        "ARGENTINA",
        "CHILE",
        "PERU"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Planete",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ],
      "difficulty": 3
    },
    {
      "category": "Instrumente cu coarde",
      "items": [
        "VIOARĂ",
        "CHITARĂ",
        "VIOLONCEL",
        "HARPĂ"
      ],
      "difficulty": 4
    },
    {
      "category": "Sporturi cu mingea",
      "items": [
        "FOTBAL",
        "BASCHET",
        "TENIS",
        "VOLEI"
      ],
      "difficulty": 2
    },
    {
      "category": "Cuvinte care încep cu 'Z'",
      "items": [
        "ZEBRĂ",
        "ZĂPADĂ",
        "ZMEU",
        "ZAR"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Fructe de pădure",
      "items": [
        "ZMEURĂ",
        "MURĂ",
        "AFINĂ",
        "FRAGĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ NEAGRĂ",
        "INIMĂ ROȘIE"
      ],
      "difficulty": 3
    },
    {
      "category": "Țări din America de Sud",
      "items": [
        "BRAZILIA",
        "ARGENTINA",
        "CHILE",
        "PERU"
      ],
      "difficulty": 1
    },
    {
      "category": "Planete",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Zodii de foc",
      "items": [
        "BERBEC",
        "LEU",
        "SĂGETĂTOR",
        "OFIUCUS (GLUMĂ)"
      ],
      "difficulty": 1
    },
    {
      "category": "Sporturi cu mingea",
      "items": [
        "FOTBAL",
        "BASCHET",
        "TENIS",
        "VOLEI"
      ],
      "difficulty": 2
    },
    {
      "category": "Cuvinte care încep cu 'Z'",
      "items": [
        "ZEBRĂ",
        "ZĂPADĂ",
        "ZMEU",
        "ZAR"
      ],
      "difficulty": 4
    },
    {
      "category": "Fructe de pădure",
      "items": [
        "ZMEURĂ",
        "MURĂ",
        "AFINĂ",
        "FRAGĂ"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Mari scriitori români",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ],
      "difficulty": 4
    },
    {
      "category": "Țări din America de Sud",
      "items": [
        "BRAZILIA",
        "ARGENTINA",
        "CHILE",
        "PERU"
      ],
      "difficulty": 1
    },
    {
      "category": "Planete",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ],
      "difficulty": 3
    },
    {
      "category": "Zodii de foc",
      "items": [
        "BERBEC",
        "LEU",
        "SĂGETĂTOR",
        "OFIUCUS (GLUMĂ)"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Limbi romanice",
      "items": [
        "ROMÂNĂ",
        "ITALIANĂ",
        "SPANIOLĂ",
        "FRANCEZĂ"
      ],
      "difficulty": 3
    },
    {
      "category": "Cuvinte care încep cu 'Z'",
      "items": [
        "ZEBRĂ",
        "ZĂPADĂ",
        "ZMEU",
        "ZAR"
      ],
      "difficulty": 4
    },
    {
      "category": "Fructe de pădure",
      "items": [
        "ZMEURĂ",
        "MURĂ",
        "AFINĂ",
        "FRAGĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Mari scriitori români",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Mărci de mașini",
      "items": [
        "FORD",
        "TOYOTA",
        "HONDA",
        "BMW"
      ],
      "difficulty": 2
    },
    {
      "category": "Planete",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ],
      "difficulty": 3
    },
    {
      "category": "Zodii de foc",
      "items": [
        "BERBEC",
        "LEU",
        "SĂGETĂTOR",
        "OFIUCUS (GLUMĂ)"
      ],
      "difficulty": 1
    },
    {
      "category": "Limbi romanice",
      "items": [
        "ROMÂNĂ",
        "ITALIANĂ",
        "SPANIOLĂ",
        "FRANCEZĂ"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Elemente chimice",
      "items": [
        "FIER",
        "AUR",
        "ARGINT",
        "CUPRU"
      ],
      "difficulty": 1
    },
    {
      "category": "Fructe de pădure",
      "items": [
        "ZMEURĂ",
        "MURĂ",
        "AFINĂ",
        "FRAGĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Mari scriitori români",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ],
      "difficulty": 4
    },
    {
      "category": "Mărci de mașini",
      "items": [
        "FORD",
        "TOYOTA",
        "HONDA",
        "BMW"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "BLUES"
      ],
      "difficulty": 4
    },
    {
      "category": "Zodii de foc",
      "items": [
        "BERBEC",
        "LEU",
        "SĂGETĂTOR",
        "OFIUCUS (GLUMĂ)"
      ],
      "difficulty": 1
    },
    {
      "category": "Limbi romanice",
      "items": [
        "ROMÂNĂ",
        "ITALIANĂ",
        "SPANIOLĂ",
        "FRANCEZĂ"
      ],
      "difficulty": 3
    },
    {
      "category": "Elemente chimice",
      "items": [
        "FIER",
        "AUR",
        "ARGINT",
        "CUPRU"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "PAPAGAL",
        "HAMSTER"
      ],
      "difficulty": 3
    },
    {
      "category": "Mari scriitori români",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ],
      "difficulty": 4
    },
    {
      "category": "Mărci de mașini",
      "items": [
        "FORD",
        "TOYOTA",
        "HONDA",
        "BMW"
      ],
      "difficulty": 2
    },
    {
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "BLUES"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Limbi romanice",
      "items": [
        "ROMÂNĂ",
        "ITALIANĂ",
        "SPANIOLĂ",
        "FRANCEZĂ"
      ],
      "difficulty": 3
    },
    {
      "category": "Elemente chimice",
      "items": [
        "FIER",
        "AUR",
        "ARGINT",
        "CUPRU"
      ],
      "difficulty": 1
    },
    {
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "PAPAGAL",
        "HAMSTER"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Mări ale lumii",
      "items": [
        "MAREA NEAGRĂ",
        "MAREA ROȘIE",
        "MAREA MOARTĂ",
        "MAREA MEDITERANĂ"
      ],
      "difficulty": 1
    },
    {
      "category": "Mărci de mașini",
      "items": [
        "FORD",
        "TOYOTA",
        "HONDA",
        "BMW"
      ],
      "difficulty": 2
    },
    {
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "BLUES"
      ],
      "difficulty": 4
    },
    {
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Zei greci",
      "items": [
        "ZEUS",
        "APOLLO",
        "ARES",
        "POSEIDON"
      ],
      "difficulty": 4
    },
    {
      "category": "Elemente chimice",
      "items": [
        "FIER",
        "AUR",
        "ARGINT",
        "CUPRU"
      ],
      "difficulty": 1
    },
    {
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "PAPAGAL",
        "HAMSTER"
      ],
      "difficulty": 3
    },
    {
      "category": "Mări ale lumii",
      "items": [
        "MAREA NEAGRĂ",
        "MAREA ROȘIE",
        "MAREA MOARTĂ",
        "MAREA MEDITERANĂ"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Sinonime pentru a vorbi",
      "items": [
        "A SPUNE",
        "A ROSTI",
        "A ZICE",
        "A DECLARA"
      ],
      "difficulty": 3
    },
    {
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "BLUES"
      ],
      "difficulty": 4
    },
    {
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Zei greci",
      "items": [
        "ZEUS",
        "APOLLO",
        "ARES",
        "POSEIDON"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Culori primare și secundare",
      "items": [
        "ROȘU",
        "ALBASTRU",
        "VERDE",
        "GALBEN"
      ],
      "difficulty": 2
    },
    {
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "PAPAGAL",
        "HAMSTER"
      ],
      "difficulty": 3
    },
    {
      "category": "Mări ale lumii",
      "items": [
        "MAREA NEAGRĂ",
        "MAREA ROȘIE",
        "MAREA MOARTĂ",
        "MAREA MEDITERANĂ"
      ],
      "difficulty": 1
    },
    {
      "category": "Sinonime pentru a vorbi",
      "items": [
        "A SPUNE",
        "A ROSTI",
        "A ZICE",
        "A DECLARA"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "MADRID",
        "ROMA"
      ],
      "difficulty": 1
    },
    {
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Zei greci",
      "items": [
        "ZEUS",
        "APOLLO",
        "ARES",
        "POSEIDON"
      ],
      "difficulty": 4
    },
    {
      "category": "Culori primare și secundare",
      "items": [
        "ROȘU",
        "ALBASTRU",
        "VERDE",
        "GALBEN"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Instrumente cu coarde",
      "items": [
        "VIOARĂ",
        "CHITARĂ",
        "VIOLONCEL",
        "HARPĂ"
      ],
      "difficulty": 4
    },
    {
      "category": "Mări ale lumii",
      "items": [
        "MAREA NEAGRĂ",
        "MAREA ROȘIE",
        "MAREA MOARTĂ",
        "MAREA MEDITERANĂ"
      ],
      "difficulty": 1
    },
    {
      "category": "Sinonime pentru a vorbi",
      "items": [
        "A SPUNE",
        "A ROSTI",
        "A ZICE",
        "A DECLARA"
      ],
      "difficulty": 3
    },
    {
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "MADRID",
        "ROMA"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ NEAGRĂ",
        "INIMĂ ROȘIE"
      ],
      "difficulty": 3
    },
    {
      "category": "Zei greci",
      "items": [
        "ZEUS",
        "APOLLO",
        "ARES",
        "POSEIDON"
      ],
      "difficulty": 4
    },
    {
      "category": "Culori primare și secundare",
      "items": [
        "ROȘU",
        "ALBASTRU",
        "VERDE",
        "GALBEN"
      ],
      "difficulty": 2
    },
    {
      "category": "Instrumente cu coarde",
      "items": [
        "VIOARĂ",
        "CHITARĂ",
        "VIOLONCEL",
        "HARPĂ"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Sporturi cu mingea",
      "items": [
        "FOTBAL",
        "BASCHET",
        "TENIS",
        "VOLEI"
      ],
      "difficulty": 2
    },
    {
      "category": "Sinonime pentru a vorbi",
      "items": [
        "A SPUNE",
        "A ROSTI",
        "A ZICE",
        "A DECLARA"
      ],
      "difficulty": 3
    },
    {
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "MADRID",
        "ROMA"
      ],
      "difficulty": 1
    },
    {
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ NEAGRĂ",
        "INIMĂ ROȘIE"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Țări din America de Sud",
      "items": [
        "BRAZILIA",
        "ARGENTINA",
        "CHILE",
        "PERU"
      ],
      "difficulty": 1
    },
    {
      "category": "Culori primare și secundare",
      "items": [
        "ROȘU",
        "ALBASTRU",
        "VERDE",
        "GALBEN"
      ],
      "difficulty": 2
    },
    {
      "category": "Instrumente cu coarde",
      "items": [
        "VIOARĂ",
        "CHITARĂ",
        "VIOLONCEL",
        "HARPĂ"
      ],
      "difficulty": 4
    },
    {
      "category": "Sporturi cu mingea",
      "items": [
        "FOTBAL",
        "BASCHET",
        "TENIS",
        "VOLEI"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Cuvinte care încep cu 'Z'",
      "items": [
        "ZEBRĂ",
        "ZĂPADĂ",
        "ZMEU",
        "ZAR"
      ],
      "difficulty": 4
    },
    {
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "MADRID",
        "ROMA"
      ],
      "difficulty": 1
    },
    {
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ NEAGRĂ",
        "INIMĂ ROȘIE"
      ],
      "difficulty": 3
    },
    {
      "category": "Țări din America de Sud",
      "items": [
        "BRAZILIA",
        "ARGENTINA",
        "CHILE",
        "PERU"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Planete",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ],
      "difficulty": 3
    },
    {
      "category": "Instrumente cu coarde",
      "items": [
        "VIOARĂ",
        "CHITARĂ",
        "VIOLONCEL",
        "HARPĂ"
      ],
      "difficulty": 4
    },
    {
      "category": "Sporturi cu mingea",
      "items": [
        "FOTBAL",
        "BASCHET",
        "TENIS",
        "VOLEI"
      ],
      "difficulty": 2
    },
    {
      "category": "Cuvinte care încep cu 'Z'",
      "items": [
        "ZEBRĂ",
        "ZĂPADĂ",
        "ZMEU",
        "ZAR"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Fructe de pădure",
      "items": [
        "ZMEURĂ",
        "MURĂ",
        "AFINĂ",
        "FRAGĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ NEAGRĂ",
        "INIMĂ ROȘIE"
      ],
      "difficulty": 3
    },
    {
      "category": "Țări din America de Sud",
      "items": [
        "BRAZILIA",
        "ARGENTINA",
        "CHILE",
        "PERU"
      ],
      "difficulty": 1
    },
    {
      "category": "Planete",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Zodii de foc",
      "items": [
        "BERBEC",
        "LEU",
        "SĂGETĂTOR",
        "OFIUCUS (GLUMĂ)"
      ],
      "difficulty": 1
    },
    {
      "category": "Sporturi cu mingea",
      "items": [
        "FOTBAL",
        "BASCHET",
        "TENIS",
        "VOLEI"
      ],
      "difficulty": 2
    },
    {
      "category": "Cuvinte care încep cu 'Z'",
      "items": [
        "ZEBRĂ",
        "ZĂPADĂ",
        "ZMEU",
        "ZAR"
      ],
      "difficulty": 4
    },
    {
      "category": "Fructe de pădure",
      "items": [
        "ZMEURĂ",
        "MURĂ",
        "AFINĂ",
        "FRAGĂ"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Mari scriitori români",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ],
      "difficulty": 4
    },
    {
      "category": "Țări din America de Sud",
      "items": [
        "BRAZILIA",
        "ARGENTINA",
        "CHILE",
        "PERU"
      ],
      "difficulty": 1
    },
    {
      "category": "Planete",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ],
      "difficulty": 3
    },
    {
      "category": "Zodii de foc",
      "items": [
        "BERBEC",
        "LEU",
        "SĂGETĂTOR",
        "OFIUCUS (GLUMĂ)"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Limbi romanice",
      "items": [
        "ROMÂNĂ",
        "ITALIANĂ",
        "SPANIOLĂ",
        "FRANCEZĂ"
      ],
      "difficulty": 3
    },
    {
      "category": "Cuvinte care încep cu 'Z'",
      "items": [
        "ZEBRĂ",
        "ZĂPADĂ",
        "ZMEU",
        "ZAR"
      ],
      "difficulty": 4
    },
    {
      "category": "Fructe de pădure",
      "items": [
        "ZMEURĂ",
        "MURĂ",
        "AFINĂ",
        "FRAGĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Mari scriitori români",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Mărci de mașini",
      "items": [
        "FORD",
        "TOYOTA",
        "HONDA",
        "BMW"
      ],
      "difficulty": 2
    },
    {
      "category": "Planete",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ],
      "difficulty": 3
    },
    {
      "category": "Zodii de foc",
      "items": [
        "BERBEC",
        "LEU",
        "SĂGETĂTOR",
        "OFIUCUS (GLUMĂ)"
      ],
      "difficulty": 1
    },
    {
      "category": "Limbi romanice",
      "items": [
        "ROMÂNĂ",
        "ITALIANĂ",
        "SPANIOLĂ",
        "FRANCEZĂ"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Elemente chimice",
      "items": [
        "FIER",
        "AUR",
        "ARGINT",
        "CUPRU"
      ],
      "difficulty": 1
    },
    {
      "category": "Fructe de pădure",
      "items": [
        "ZMEURĂ",
        "MURĂ",
        "AFINĂ",
        "FRAGĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Mari scriitori români",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ],
      "difficulty": 4
    },
    {
      "category": "Mărci de mașini",
      "items": [
        "FORD",
        "TOYOTA",
        "HONDA",
        "BMW"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "BLUES"
      ],
      "difficulty": 4
    },
    {
      "category": "Zodii de foc",
      "items": [
        "BERBEC",
        "LEU",
        "SĂGETĂTOR",
        "OFIUCUS (GLUMĂ)"
      ],
      "difficulty": 1
    },
    {
      "category": "Limbi romanice",
      "items": [
        "ROMÂNĂ",
        "ITALIANĂ",
        "SPANIOLĂ",
        "FRANCEZĂ"
      ],
      "difficulty": 3
    },
    {
      "category": "Elemente chimice",
      "items": [
        "FIER",
        "AUR",
        "ARGINT",
        "CUPRU"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "PAPAGAL",
        "HAMSTER"
      ],
      "difficulty": 3
    },
    {
      "category": "Mari scriitori români",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ],
      "difficulty": 4
    },
    {
      "category": "Mărci de mașini",
      "items": [
        "FORD",
        "TOYOTA",
        "HONDA",
        "BMW"
      ],
      "difficulty": 2
    },
    {
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "BLUES"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Limbi romanice",
      "items": [
        "ROMÂNĂ",
        "ITALIANĂ",
        "SPANIOLĂ",
        "FRANCEZĂ"
      ],
      "difficulty": 3
    },
    {
      "category": "Elemente chimice",
      "items": [
        "FIER",
        "AUR",
        "ARGINT",
        "CUPRU"
      ],
      "difficulty": 1
    },
    {
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "PAPAGAL",
        "HAMSTER"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Mări ale lumii",
      "items": [
        "MAREA NEAGRĂ",
        "MAREA ROȘIE",
        "MAREA MOARTĂ",
        "MAREA MEDITERANĂ"
      ],
      "difficulty": 1
    },
    {
      "category": "Mărci de mașini",
      "items": [
        "FORD",
        "TOYOTA",
        "HONDA",
        "BMW"
      ],
      "difficulty": 2
    },
    {
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "BLUES"
      ],
      "difficulty": 4
    },
    {
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Zei greci",
      "items": [
        "ZEUS",
        "APOLLO",
        "ARES",
        "POSEIDON"
      ],
      "difficulty": 4
    },
    {
      "category": "Elemente chimice",
      "items": [
        "FIER",
        "AUR",
        "ARGINT",
        "CUPRU"
      ],
      "difficulty": 1
    },
    {
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "PAPAGAL",
        "HAMSTER"
      ],
      "difficulty": 3
    },
    {
      "category": "Mări ale lumii",
      "items": [
        "MAREA NEAGRĂ",
        "MAREA ROȘIE",
        "MAREA MOARTĂ",
        "MAREA MEDITERANĂ"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Sinonime pentru a vorbi",
      "items": [
        "A SPUNE",
        "A ROSTI",
        "A ZICE",
        "A DECLARA"
      ],
      "difficulty": 3
    },
    {
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "BLUES"
      ],
      "difficulty": 4
    },
    {
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Zei greci",
      "items": [
        "ZEUS",
        "APOLLO",
        "ARES",
        "POSEIDON"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Culori primare și secundare",
      "items": [
        "ROȘU",
        "ALBASTRU",
        "VERDE",
        "GALBEN"
      ],
      "difficulty": 2
    },
    {
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "PAPAGAL",
        "HAMSTER"
      ],
      "difficulty": 3
    },
    {
      "category": "Mări ale lumii",
      "items": [
        "MAREA NEAGRĂ",
        "MAREA ROȘIE",
        "MAREA MOARTĂ",
        "MAREA MEDITERANĂ"
      ],
      "difficulty": 1
    },
    {
      "category": "Sinonime pentru a vorbi",
      "items": [
        "A SPUNE",
        "A ROSTI",
        "A ZICE",
        "A DECLARA"
      ],
      "difficulty": 3
    }
  ],
  [
    {
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "MADRID",
        "ROMA"
      ],
      "difficulty": 1
    },
    {
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ],
      "difficulty": 2
    },
    {
      "category": "Zei greci",
      "items": [
        "ZEUS",
        "APOLLO",
        "ARES",
        "POSEIDON"
      ],
      "difficulty": 4
    },
    {
      "category": "Culori primare și secundare",
      "items": [
        "ROȘU",
        "ALBASTRU",
        "VERDE",
        "GALBEN"
      ],
      "difficulty": 2
    }
  ],
  [
    {
      "category": "Instrumente cu coarde",
      "items": [
        "VIOARĂ",
        "CHITARĂ",
        "VIOLONCEL",
        "HARPĂ"
      ],
      "difficulty": 4
    },
    {
      "category": "Mări ale lumii",
      "items": [
        "MAREA NEAGRĂ",
        "MAREA ROȘIE",
        "MAREA MOARTĂ",
        "MAREA MEDITERANĂ"
      ],
      "difficulty": 1
    },
    {
      "category": "Sinonime pentru a vorbi",
      "items": [
        "A SPUNE",
        "A ROSTI",
        "A ZICE",
        "A DECLARA"
      ],
      "difficulty": 3
    },
    {
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "MADRID",
        "ROMA"
      ],
      "difficulty": 1
    }
  ],
  [
    {
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ NEAGRĂ",
        "INIMĂ ROȘIE"
      ],
      "difficulty": 3
    },
    {
      "category": "Zei greci",
      "items": [
        "ZEUS",
        "APOLLO",
        "ARES",
        "POSEIDON"
      ],
      "difficulty": 4
    },
    {
      "category": "Culori primare și secundare",
      "items": [
        "ROȘU",
        "ALBASTRU",
        "VERDE",
        "GALBEN"
      ],
      "difficulty": 2
    },
    {
      "category": "Instrumente cu coarde",
      "items": [
        "VIOARĂ",
        "CHITARĂ",
        "VIOLONCEL",
        "HARPĂ"
      ],
      "difficulty": 4
    }
  ],
  [
    {
      "category": "Sporturi cu mingea",
      "items": [
        "FOTBAL",
        "BASCHET",
        "TENIS",
        "VOLEI"
      ],
      "difficulty": 2
    },
    {
      "category": "Sinonime pentru a vorbi",
      "items": [
        "A SPUNE",
        "A ROSTI",
        "A ZICE",
        "A DECLARA"
      ],
      "difficulty": 3
    },
    {
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "MADRID",
        "ROMA"
      ],
      "difficulty": 1
    },
    {
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ NEAGRĂ",
        "INIMĂ ROȘIE"
      ],
      "difficulty": 3
    }
  ]
];

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
