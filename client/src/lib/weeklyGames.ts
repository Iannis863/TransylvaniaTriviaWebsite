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
// CONTENT POOLS (40 Weeks Absolutely Unique - Zero Repeats)
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
      "id": "t0_0",
      "year": 1918,
      "content": "Marea Unire de la Alba Iulia"
    },
    {
      "id": "t0_1",
      "year": 1859,
      "content": "Mica Unire (Unirea Principatelor)"
    },
    {
      "id": "t0_2",
      "year": 1989,
      "content": "Revoluția Română"
    },
    {
      "id": "t0_3",
      "year": 2007,
      "content": "Intrarea României în UE"
    },
    {
      "id": "t0_4",
      "year": 2004,
      "content": "Intrarea României în NATO"
    }
  ],
  [
    {
      "id": "t1_0",
      "year": 1877,
      "content": "Independența României"
    },
    {
      "id": "t1_1",
      "year": 1914,
      "content": "Începutul Primului Război Mondial"
    },
    {
      "id": "t1_2",
      "year": 1939,
      "content": "Începutul celui de-Al Doilea Război Mondial"
    },
    {
      "id": "t1_3",
      "year": 1945,
      "content": "Sfârșitul celui de-Al Doilea Război Mondial"
    },
    {
      "id": "t1_4",
      "year": 1989,
      "content": "Căderea Zidului Berlinului"
    }
  ],
  [
    {
      "id": "t2_0",
      "year": 1969,
      "content": "Aterizarea pe Lună"
    },
    {
      "id": "t2_1",
      "year": 1963,
      "content": "Asasinarea lui JFK"
    },
    {
      "id": "t2_2",
      "year": 1912,
      "content": "Scufundarea Titanicului"
    },
    {
      "id": "t2_3",
      "year": 2001,
      "content": "Atentatele din 11 septembrie"
    },
    {
      "id": "t2_4",
      "year": 1492,
      "content": "Descoperirea Americii de Columb"
    }
  ],
  [
    {
      "id": "t3_0",
      "year": 1789,
      "content": "Începutul Revoluției Franceze"
    },
    {
      "id": "t3_1",
      "year": 1919,
      "content": "Tratatul de la Versailles"
    },
    {
      "id": "t3_2",
      "year": 1998,
      "content": "Crearea motorului de căutare Google"
    },
    {
      "id": "t3_3",
      "year": 2007,
      "content": "Lansarea primului iPhone"
    },
    {
      "id": "t3_4",
      "year": 1989,
      "content": "Invenția World Wide Web (WWW)"
    }
  ],
  [
    {
      "id": "t4_0",
      "year": 1975,
      "content": "Fondarea companiei Microsoft"
    },
    {
      "id": "t4_1",
      "year": 2004,
      "content": "Lansarea platformei Facebook"
    },
    {
      "id": "t4_2",
      "year": 1961,
      "content": "Primul zbor în spațiu (Iuri Gagarin)"
    },
    {
      "id": "t4_3",
      "year": 1928,
      "content": "Descoperirea penicilinei (Fleming)"
    },
    {
      "id": "t4_4",
      "year": 1903,
      "content": "Primul zbor al fraților Wright"
    }
  ],
  [
    {
      "id": "t5_0",
      "year": 1957,
      "content": "Lansarea satelitului Sputnik"
    },
    {
      "id": "t5_1",
      "year": 1981,
      "content": "Lansarea primului PC IBM"
    },
    {
      "id": "t5_2",
      "year": 1977,
      "content": "Lansarea primului film Star Wars"
    },
    {
      "id": "t5_3",
      "year": 1999,
      "content": "Lansarea filmului The Matrix"
    },
    {
      "id": "t5_4",
      "year": 2001,
      "content": "Primul film Harry Potter"
    }
  ],
  [
    {
      "id": "t6_0",
      "year": 2009,
      "content": "Lansarea filmului Avatar"
    },
    {
      "id": "t6_1",
      "year": 1994,
      "content": "Lansarea consolei PlayStation 1"
    },
    {
      "id": "t6_2",
      "year": 1989,
      "content": "Debutul serialului The Simpsons"
    },
    {
      "id": "t6_3",
      "year": 1982,
      "content": "Lansarea albumului Thriller (M. Jackson)"
    },
    {
      "id": "t6_4",
      "year": 1997,
      "content": "Lansarea filmului Titanic"
    }
  ],
  [
    {
      "id": "t7_0",
      "year": 1929,
      "content": "Prima ediție a Premiilor Oscar"
    },
    {
      "id": "t7_1",
      "year": 1776,
      "content": "Declarația de Independență a SUA"
    },
    {
      "id": "t7_2",
      "year": 1815,
      "content": "Bătălia de la Waterloo"
    },
    {
      "id": "t7_3",
      "year": 1917,
      "content": "Revoluția Bolșevică"
    },
    {
      "id": "t7_4",
      "year": 1848,
      "content": "Revoluția Pașoptistă"
    }
  ],
  [
    {
      "id": "t8_0",
      "year": 1600,
      "content": "Unirea realizată de Mihai Viteazul"
    },
    {
      "id": "t8_1",
      "year": 1453,
      "content": "Căderea Constantinopolului"
    },
    {
      "id": "t8_2",
      "year": 1595,
      "content": "Bătălia de la Călugăreni"
    },
    {
      "id": "t8_3",
      "year": 1475,
      "content": "Bătălia de la Vaslui"
    },
    {
      "id": "t8_4",
      "year": 1330,
      "content": "Bătălia de la Posada"
    }
  ],
  [
    {
      "id": "t9_0",
      "year": 1955,
      "content": "Înființarea Pactului de la Varșovia"
    },
    {
      "id": "t9_1",
      "year": 1949,
      "content": "Înființarea NATO"
    },
    {
      "id": "t9_2",
      "year": 1962,
      "content": "Criza Rachetelor din Cuba"
    },
    {
      "id": "t9_3",
      "year": 1986,
      "content": "Dezastrul nuclear de la Cernobîl"
    },
    {
      "id": "t9_4",
      "year": 1911,
      "content": "Atingerea Polului Sud (Amundsen)"
    }
  ],
  [
    {
      "id": "t10_0",
      "year": 1909,
      "content": "Atingerea Polului Nord (Peary)"
    },
    {
      "id": "t10_1",
      "year": 1953,
      "content": "Escaladarea Muntelui Everest (Hillary)"
    },
    {
      "id": "t10_2",
      "year": 1922,
      "content": "Descoperirea mormântului lui Tutankhamon"
    },
    {
      "id": "t10_3",
      "year": 1944,
      "content": "Debarcarea din Normandia (Ziua Z)"
    },
    {
      "id": "t10_4",
      "year": 1941,
      "content": "Atacul de la Pearl Harbor"
    }
  ],
  [
    {
      "id": "t11_0",
      "year": 1991,
      "content": "Destrămarea Uniunii Sovietice"
    },
    {
      "id": "t11_1",
      "year": 1993,
      "content": "Divizarea Cehoslovaciei"
    },
    {
      "id": "t11_2",
      "year": 1990,
      "content": "Eliberarea lui Nelson Mandela"
    },
    {
      "id": "t11_3",
      "year": 1997,
      "content": "Retrocedarea Hong Kong-ului"
    },
    {
      "id": "t11_4",
      "year": 2008,
      "content": "Criza Financiară Globală"
    }
  ],
  [
    {
      "id": "t12_0",
      "year": 2011,
      "content": "Accidentul nuclear de la Fukushima"
    },
    {
      "id": "t12_1",
      "year": 2020,
      "content": "Începutul pandemiei de COVID-19"
    },
    {
      "id": "t12_2",
      "year": 1912,
      "content": "Primul Război Balcanic"
    },
    {
      "id": "t12_3",
      "year": 1913,
      "content": "Al Doilea Război Balcanic"
    },
    {
      "id": "t12_4",
      "year": 1878,
      "content": "Tratatul de la Berlin"
    }
  ],
  [
    {
      "id": "t13_0",
      "year": 1866,
      "content": "Aducerea lui Carol I în România"
    },
    {
      "id": "t13_1",
      "year": 1881,
      "content": "România devine Regat"
    },
    {
      "id": "t13_2",
      "year": 1923,
      "content": "Adoptarea Constituției României Mari"
    },
    {
      "id": "t13_3",
      "year": 1947,
      "content": "Abdicarea Regelui Mihai I"
    },
    {
      "id": "t13_4",
      "year": 1965,
      "content": "Ceaușescu devine liderul PCR"
    }
  ],
  [
    {
      "id": "t14_0",
      "year": 1977,
      "content": "Cutremurul devastator din România"
    },
    {
      "id": "t14_1",
      "year": 1996,
      "content": "Emil Constantinescu câștigă alegerile"
    },
    {
      "id": "t14_2",
      "year": 2000,
      "content": "Alegerile cu Ion Iliescu și C.V. Tudor"
    },
    {
      "id": "t14_3",
      "year": 2015,
      "content": "Tragedia de la Colectiv"
    },
    {
      "id": "t14_4",
      "year": 1984,
      "content": "Inaugurarea Canalului Dunăre-Marea Neagră"
    }
  ],
  [
    {
      "id": "t15_0",
      "year": 1974,
      "content": "Abba câștigă Eurovision cu Waterloo"
    },
    {
      "id": "t15_1",
      "year": 1969,
      "content": "Festivalul Woodstock"
    },
    {
      "id": "t15_2",
      "year": 1985,
      "content": "Concertul Live Aid"
    },
    {
      "id": "t15_3",
      "year": 1991,
      "content": "Moartea lui Freddie Mercury"
    },
    {
      "id": "t15_4",
      "year": 1980,
      "content": "Asasinarea lui John Lennon"
    }
  ],
  [
    {
      "id": "t16_0",
      "year": 1973,
      "content": "Inaugurarea Sydney Opera House"
    },
    {
      "id": "t16_1",
      "year": 1889,
      "content": "Inaugurarea Turnului Eiffel"
    },
    {
      "id": "t16_2",
      "year": 1886,
      "content": "Inaugurarea Statuii Libertății"
    },
    {
      "id": "t16_3",
      "year": 1906,
      "content": "Inaugurarea Cazinoului din Constanța"
    },
    {
      "id": "t16_4",
      "year": 1933,
      "content": "Hitler devine cancelar al Germaniei"
    }
  ],
  [
    {
      "id": "t17_0",
      "year": 1922,
      "content": "Mussolini vine la putere"
    },
    {
      "id": "t17_1",
      "year": 1936,
      "content": "Începutul Războiului Civil Spaniol"
    },
    {
      "id": "t17_2",
      "year": 1945,
      "content": "Bombardamentele de la Hiroshima și Nagasaki"
    },
    {
      "id": "t17_3",
      "year": 1950,
      "content": "Începutul Războiului din Coreea"
    },
    {
      "id": "t17_4",
      "year": 1955,
      "content": "Începutul Războiului din Vietnam"
    }
  ],
  [
    {
      "id": "t18_0",
      "year": 1990,
      "content": "Războiul din Golful Persic"
    },
    {
      "id": "t18_1",
      "year": 1999,
      "content": "Intervenția NATO în Iugoslavia"
    },
    {
      "id": "t18_2",
      "year": 2003,
      "content": "Începutul Războiului din Irak"
    },
    {
      "id": "t18_3",
      "year": 2016,
      "content": "Referendumul pentru Brexit"
    },
    {
      "id": "t18_4",
      "year": 1920,
      "content": "Înființarea Ligii Națiunilor"
    }
  ],
  [
    {
      "id": "t19_0",
      "year": 1945,
      "content": "Înființarea Organizației Națiunilor Unite"
    },
    {
      "id": "t19_1",
      "year": 1948,
      "content": "Declarația Universală a Drepturilor Omului"
    },
    {
      "id": "t19_2",
      "year": 1957,
      "content": "Tratatul de la Roma (baza UE)"
    },
    {
      "id": "t19_3",
      "year": 2002,
      "content": "Introducerea monedei Euro"
    },
    {
      "id": "t19_4",
      "year": 1912,
      "content": "Inventarea parașutei"
    }
  ],
  [
    {
      "id": "t20_0",
      "year": 1876,
      "content": "Inventarea telefonului (Bell)"
    },
    {
      "id": "t20_1",
      "year": 1879,
      "content": "Inventarea becului (Edison)"
    },
    {
      "id": "t20_2",
      "year": 1895,
      "content": "Prima proiecție cinematografică (Lumière)"
    },
    {
      "id": "t20_3",
      "year": 1927,
      "content": "Primul film cu sunet (The Jazz Singer)"
    },
    {
      "id": "t20_4",
      "year": 1937,
      "content": "Dezastrul Hindenburg"
    }
  ],
  [
    {
      "id": "t21_0",
      "year": 1986,
      "content": "Dezastrul navetei Challenger"
    },
    {
      "id": "t21_1",
      "year": 2003,
      "content": "Dezastrul navetei Columbia"
    },
    {
      "id": "t21_2",
      "year": 1990,
      "content": "Lansarea telescopului spațial Hubble"
    },
    {
      "id": "t21_3",
      "year": 2021,
      "content": "Lansarea telescopului James Webb"
    },
    {
      "id": "t21_4",
      "year": 1921,
      "content": "Descoperirea insulinei (Banting)"
    }
  ],
  [
    {
      "id": "t22_0",
      "year": 1953,
      "content": "Descoperirea structurii ADN-ului"
    },
    {
      "id": "t22_1",
      "year": 1895,
      "content": "Descoperirea razelor X (Röntgen)"
    },
    {
      "id": "t22_2",
      "year": 1898,
      "content": "Descoperirea radiului (Marie Curie)"
    },
    {
      "id": "t22_3",
      "year": 1967,
      "content": "Primul transplant de inimă (Barnard)"
    },
    {
      "id": "t22_4",
      "year": 1996,
      "content": "Clonarea oii Dolly"
    }
  ],
  [
    {
      "id": "t23_0",
      "year": 2012,
      "content": "Descoperirea Bosonului Higgs"
    },
    {
      "id": "t23_1",
      "year": 1901,
      "content": "Acordarea primelor Premii Nobel"
    },
    {
      "id": "t23_2",
      "year": 1930,
      "content": "Descoperirea planetei Pluto"
    },
    {
      "id": "t23_3",
      "year": 2006,
      "content": "Pluto este retrogradată ca planetă pitică"
    },
    {
      "id": "t23_4",
      "year": 1915,
      "content": "Teoria Relativității Generale (Einstein)"
    }
  ],
  [
    {
      "id": "t24_0",
      "year": 1687,
      "content": "Publicarea legilor mișcării de către Newton"
    },
    {
      "id": "t24_1",
      "year": 1859,
      "content": "Originea Speciilor (Charles Darwin)"
    },
    {
      "id": "t24_2",
      "year": 1439,
      "content": "Invenția tiparului (Gutenberg)"
    },
    {
      "id": "t24_3",
      "year": 1796,
      "content": "Primul vaccin (Edward Jenner)"
    },
    {
      "id": "t24_4",
      "year": 1971,
      "content": "Trimiterea primului e-mail"
    }
  ],
  [
    {
      "id": "t25_0",
      "year": 1992,
      "content": "Trimiterea primului SMS"
    },
    {
      "id": "t25_1",
      "year": 1983,
      "content": "Apariția protocolului TCP/IP"
    },
    {
      "id": "t25_2",
      "year": 1993,
      "content": "Lansarea primului browser (Mosaic)"
    },
    {
      "id": "t25_3",
      "year": 1995,
      "content": "Lansarea Amazon și eBay"
    },
    {
      "id": "t25_4",
      "year": 2005,
      "content": "Lansarea YouTube"
    }
  ],
  [
    {
      "id": "t26_0",
      "year": 2006,
      "content": "Lansarea Twitter"
    },
    {
      "id": "t26_1",
      "year": 2010,
      "content": "Lansarea Instagram"
    },
    {
      "id": "t26_2",
      "year": 1976,
      "content": "Fondarea companiei Apple"
    },
    {
      "id": "t26_3",
      "year": 1984,
      "content": "Lansarea primului Macintosh"
    },
    {
      "id": "t26_4",
      "year": 2010,
      "content": "Lansarea primului iPad"
    }
  ],
  [
    {
      "id": "t27_0",
      "year": 1968,
      "content": "Asasinarea lui Martin Luther King Jr."
    },
    {
      "id": "t27_1",
      "year": 1965,
      "content": "Asasinarea lui Malcolm X"
    },
    {
      "id": "t27_2",
      "year": 1948,
      "content": "Asasinarea lui Mahatma Gandhi"
    },
    {
      "id": "t27_3",
      "year": 1865,
      "content": "Asasinarea lui Abraham Lincoln"
    },
    {
      "id": "t27_4",
      "year": 1901,
      "content": "Asasinarea președintelui McKinley"
    }
  ],
  [
    {
      "id": "t28_0",
      "year": 1881,
      "content": "Asasinarea Țarului Alexandru al II-lea"
    },
    {
      "id": "t28_1",
      "year": 1916,
      "content": "Asasinarea lui Grigori Rasputin"
    },
    {
      "id": "t28_2",
      "year": 1940,
      "content": "Asasinarea lui Lev Troțki"
    },
    {
      "id": "t28_3",
      "year": 1978,
      "content": "Asasinarea lui Aldo Moro"
    },
    {
      "id": "t28_4",
      "year": 2007,
      "content": "Asasinarea lui Benazir Bhutto"
    }
  ],
  [
    {
      "id": "t29_0",
      "year": 1919,
      "content": "Revolta de la Brașov"
    },
    {
      "id": "t29_1",
      "year": 1924,
      "content": "Răscoala de la Tatarbunar"
    },
    {
      "id": "t29_2",
      "year": 1933,
      "content": "Grevele de la Grivița"
    },
    {
      "id": "t29_3",
      "year": 1987,
      "content": "Revolta muncitorilor din Brașov"
    },
    {
      "id": "t29_4",
      "year": 1990,
      "content": "Mineriada din iunie"
    }
  ],
  [
    {
      "id": "t30_0",
      "year": 1991,
      "content": "Mineriada din septembrie"
    },
    {
      "id": "t30_1",
      "year": 1999,
      "content": "Pacea de la Cozia (Mineriada din 1999)"
    },
    {
      "id": "t30_2",
      "year": 2008,
      "content": "Summitul NATO de la București"
    },
    {
      "id": "t30_3",
      "year": 2019,
      "content": "Vizita Papei Francisc în România"
    },
    {
      "id": "t30_4",
      "year": 1999,
      "content": "Vizita Papei Ioan Paul al II-lea în România"
    }
  ],
  [
    {
      "id": "t31_0",
      "year": 1974,
      "content": "România se califică la CM după 36 ani"
    },
    {
      "id": "t31_1",
      "year": 1994,
      "content": "Generația de Aur la World Cup USA"
    },
    {
      "id": "t31_2",
      "year": 1986,
      "content": "Steaua București câștigă CCE"
    },
    {
      "id": "t31_3",
      "year": 1989,
      "content": "Dinamo București în semifinalele Cupei Cupelor"
    },
    {
      "id": "t31_4",
      "year": 1973,
      "content": "Ilie Năstase devine nr 1 ATP"
    }
  ],
  [
    {
      "id": "t32_0",
      "year": 2018,
      "content": "Simona Halep câștigă Roland Garros"
    },
    {
      "id": "t32_1",
      "year": 2019,
      "content": "Simona Halep câștigă Wimbledon"
    },
    {
      "id": "t32_2",
      "year": 1960,
      "content": "Iolanda Balaș ia aur olimpic la Roma"
    },
    {
      "id": "t32_3",
      "year": 1984,
      "content": "România participă la JO de la Los Angeles"
    },
    {
      "id": "t32_4",
      "year": 2004,
      "content": "România ia 3 aur la gimnastică (Atena)"
    }
  ],
  [
    {
      "id": "t33_0",
      "year": 1930,
      "content": "Primul Campionat Mondial de Fotbal (Uruguay)"
    },
    {
      "id": "t33_1",
      "year": 1950,
      "content": "Maracanazo (Uruguay bate Brazilia)"
    },
    {
      "id": "t33_2",
      "year": 1954,
      "content": "Miracolul de la Berna (Germania bate Ungaria)"
    },
    {
      "id": "t33_3",
      "year": 1966,
      "content": "Anglia câștigă singura sa Cupă Mondială"
    },
    {
      "id": "t33_4",
      "year": 1998,
      "content": "Franța câștigă Cupa Mondială acasă"
    }
  ],
  [
    {
      "id": "t34_0",
      "year": 2022,
      "content": "Argentina câștigă Cupa Mondială (Qatar)"
    },
    {
      "id": "t34_1",
      "year": 1896,
      "content": "Primele Jocuri Olimpice moderne (Atena)"
    },
    {
      "id": "t34_2",
      "year": 1936,
      "content": "JO de la Berlin (Jesse Owens)"
    },
    {
      "id": "t34_3",
      "year": 1972,
      "content": "Masacrul de la Jocurile Olimpice din München"
    },
    {
      "id": "t34_4",
      "year": 1980,
      "content": "Boicotul Jocurilor Olimpice de la Moscova"
    }
  ],
  [
    {
      "id": "t35_0",
      "year": 2008,
      "content": "Jocurile Olimpice de la Beijing"
    },
    {
      "id": "t35_1",
      "year": 2024,
      "content": "Jocurile Olimpice de la Paris"
    },
    {
      "id": "t35_2",
      "year": 1956,
      "content": "Revoluția Maghiară (înăbușită de URSS)"
    },
    {
      "id": "t35_3",
      "year": 1968,
      "content": "Primăvara de la Praga"
    },
    {
      "id": "t35_4",
      "year": 1979,
      "content": "Revoluția Islamică din Iran"
    }
  ],
  [
    {
      "id": "t36_0",
      "year": 1979,
      "content": "Invazia sovietică în Afganistan"
    },
    {
      "id": "t36_1",
      "year": 2010,
      "content": "Începutul Primăverii Arabe"
    },
    {
      "id": "t36_2",
      "year": 1994,
      "content": "Începutul genocidului din Rwanda"
    },
    {
      "id": "t36_3",
      "year": 1995,
      "content": "Masacrul de la Srebrenica"
    },
    {
      "id": "t36_4",
      "year": 2004,
      "content": "Tsunamiul devastator din Oceanul Indian"
    }
  ],
  [
    {
      "id": "t37_0",
      "year": 1906,
      "content": "Cutremurul din San Francisco"
    },
    {
      "id": "t37_1",
      "year": 1923,
      "content": "Cutremurul din Kanto (Japonia)"
    },
    {
      "id": "t37_2",
      "year": 1914,
      "content": "Finalizarea Canalului Panama"
    },
    {
      "id": "t37_3",
      "year": 1869,
      "content": "Finalizarea Canalului Suez"
    },
    {
      "id": "t37_4",
      "year": 1931,
      "content": "Inaugurarea Empire State Building"
    }
  ],
  [
    {
      "id": "t38_0",
      "year": 2010,
      "content": "Inaugurarea Burj Khalifa"
    },
    {
      "id": "t38_1",
      "year": 1883,
      "content": "Erupția vulcanului Krakatoa"
    },
    {
      "id": "t38_2",
      "year": 79,
      "content": "Erupția vulcanului Vezuviu (Pompeii)"
    },
    {
      "id": "t38_3",
      "year": 1666,
      "content": "Marele Incendiu din Londra"
    },
    {
      "id": "t38_4",
      "year": 1755,
      "content": "Cutremurul din Lisabona"
    }
  ],
  [
    {
      "id": "t39_0",
      "year": 1927,
      "content": "Zborul transatlantic al lui Charles Lindbergh"
    },
    {
      "id": "t39_1",
      "year": 1937,
      "content": "Inaugurarea Golden Gate Bridge"
    },
    {
      "id": "t39_2",
      "year": 1885,
      "content": "Inventarea automobilului (Karl Benz)"
    },
    {
      "id": "t39_3",
      "year": 1908,
      "content": "Modelul T Ford revoluționează industria"
    },
    {
      "id": "t39_4",
      "year": 1994,
      "content": "Deschiderea Tunelului Mânecii"
    }
  ]
];

const CONNECTIONS_SETS = [
  [
    {
      "difficulty": 1,
      "category": "Culori primare",
      "items": [
        "ROȘU",
        "GALBEN",
        "ALBASTRU",
        "VERDE"
      ]
    },
    {
      "difficulty": 2,
      "category": "Mărci auto germane",
      "items": [
        "BMW",
        "AUDI",
        "MERCEDES",
        "VOLKSWAGEN"
      ]
    },
    {
      "difficulty": 3,
      "category": "Păsări nezburătoare",
      "items": [
        "PINGUIN",
        "STRUȚ",
        "KIWI",
        "EMU"
      ]
    },
    {
      "difficulty": 4,
      "category": "Instrumente cu clape",
      "items": [
        "PIAN",
        "ORGĂ",
        "SINTETIZATOR",
        "ACORDEON"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Zodii de apă",
      "items": [
        "RAC",
        "SCORPION",
        "PEȘTI",
        "VĂRSĂTOR (CAPCANĂ)"
      ]
    },
    {
      "difficulty": 2,
      "category": "Capitale europene",
      "items": [
        "PARIS",
        "BERLIN",
        "ROMA",
        "MADRID"
      ]
    },
    {
      "difficulty": 3,
      "category": "Elemente chimice nobile",
      "items": [
        "HELIUM",
        "NEON",
        "ARGON",
        "KRYPTON"
      ]
    },
    {
      "difficulty": 4,
      "category": "Fructe exotice",
      "items": [
        "MANGO",
        "PAPAYA",
        "ANANAS",
        "KIWI"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Animale de companie",
      "items": [
        "CÂINE",
        "PISICĂ",
        "HAMSTER",
        "PAPAGAL"
      ]
    },
    {
      "difficulty": 2,
      "category": "Sporturi de echipă",
      "items": [
        "FOTBAL",
        "BASCHET",
        "VOLEI",
        "HANDBAL"
      ]
    },
    {
      "difficulty": 3,
      "category": "Anotimpuri",
      "items": [
        "PRIMĂVARĂ",
        "VARĂ",
        "TOAMNĂ",
        "IARNĂ"
      ]
    },
    {
      "difficulty": 4,
      "category": "Piese de șah",
      "items": [
        "REGE",
        "REGINĂ",
        "NEBUN",
        "CAL"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Continente",
      "items": [
        "EUROPA",
        "ASIA",
        "AFRICA",
        "AMERICA"
      ]
    },
    {
      "difficulty": 2,
      "category": "Zei greci majori",
      "items": [
        "ZEUS",
        "POSEIDON",
        "ARES",
        "APOLLO"
      ]
    },
    {
      "difficulty": 3,
      "category": "Timpuri verbale românești",
      "items": [
        "PREZENT",
        "IMPERFECT",
        "PERFECT",
        "VIITOR"
      ]
    },
    {
      "difficulty": 4,
      "category": "Sinonime pentru \"Mare\"",
      "items": [
        "IMENS",
        "URIAȘ",
        "GIGANTIC",
        "COLOSAL"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Flori de primăvară",
      "items": [
        "GHIOCEL",
        "LALEA",
        "ZAMBILĂ",
        "NARCISĂ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Sisteme de operare",
      "items": [
        "WINDOWS",
        "MACOS",
        "LINUX",
        "ANDROID"
      ]
    },
    {
      "difficulty": 3,
      "category": "Rețele sociale",
      "items": [
        "FACEBOOK",
        "INSTAGRAM",
        "TWITTER",
        "TIKTOK"
      ]
    },
    {
      "difficulty": 4,
      "category": "Luni ale anului",
      "items": [
        "IANUARIE",
        "FEBRUARIE",
        "MARTIE",
        "APRILIE"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Organe umane",
      "items": [
        "INIMĂ",
        "FICAT",
        "PLĂMÂN",
        "RINICHI"
      ]
    },
    {
      "difficulty": 2,
      "category": "Genuri muzicale",
      "items": [
        "ROCK",
        "POP",
        "JAZZ",
        "HIP-HOP"
      ]
    },
    {
      "difficulty": 3,
      "category": "Valute internaționale",
      "items": [
        "DOLAR",
        "EURO",
        "LIRĂ",
        "YEN"
      ]
    },
    {
      "difficulty": 4,
      "category": "Materiale de construcție",
      "items": [
        "CIMENT",
        "CĂRĂMIDĂ",
        "LEMN",
        "OȚEL"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Tipuri de triunghiuri",
      "items": [
        "ECHILATERAL",
        "ISOSCEL",
        "SCALEN",
        "DREPTUNGHIC"
      ]
    },
    {
      "difficulty": 2,
      "category": "Scriitori români clasici",
      "items": [
        "EMINESCU",
        "CREANGĂ",
        "CARAGIALE",
        "SLAVICI"
      ]
    },
    {
      "difficulty": 3,
      "category": "Mări faimoase",
      "items": [
        "NEAGRĂ",
        "ROȘIE",
        "MOARTĂ",
        "MEDITERANĂ"
      ]
    },
    {
      "difficulty": 4,
      "category": "Faze ale lunii",
      "items": [
        "PLINĂ",
        "NOUĂ",
        "SEMI",
        "PĂTRAR"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Tipuri de nuci",
      "items": [
        "NUCĂ",
        "ALUNĂ",
        "MIGDALĂ",
        "FISTIC"
      ]
    },
    {
      "difficulty": 2,
      "category": "Arte marțiale",
      "items": [
        "KARATE",
        "JUDO",
        "TAEKWONDO",
        "KUNG-FU"
      ]
    },
    {
      "difficulty": 3,
      "category": "Aștri cerești",
      "items": [
        "SOARE",
        "LUNĂ",
        "STELE",
        "COMETE"
      ]
    },
    {
      "difficulty": 4,
      "category": "Metal prețios",
      "items": [
        "AUR",
        "ARGINT",
        "PLATINĂ",
        "PALADIU"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Județe din Transilvania",
      "items": [
        "CLUJ",
        "BRAȘOV",
        "SIBIU",
        "MUREȘ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Râuri din România",
      "items": [
        "MUREȘ",
        "OLT",
        "SIRET",
        "PRUT"
      ]
    },
    {
      "difficulty": 3,
      "category": "Mari inventatori",
      "items": [
        "EDISON",
        "TESLA",
        "EINSTEIN",
        "NEWTON"
      ]
    },
    {
      "difficulty": 4,
      "category": "Mari exploratori",
      "items": [
        "COLUMB",
        "MAGELLAN",
        "POLO",
        "COOK"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Tipuri de pâine",
      "items": [
        "FRANZELE",
        "CHIFLE",
        "BAGHETE",
        "LIPII"
      ]
    },
    {
      "difficulty": 2,
      "category": "Băuturi calde",
      "items": [
        "CAFEA",
        "CEAI",
        "CIOCOLATĂ",
        "LAPTE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de brânză",
      "items": [
        "TELEMEA",
        "CAȘCAVAL",
        "MOZZARELLA",
        "GOUDA"
      ]
    },
    {
      "difficulty": 4,
      "category": "Condimente",
      "items": [
        "SARE",
        "PIPER",
        "BOIA",
        "CIMBRU"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Animale africane",
      "items": [
        "LEU",
        "ZEBRĂ",
        "ELEFANT",
        "GIRAFĂ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Părți ale calculatorului",
      "items": [
        "MONITOR",
        "TASTATURĂ",
        "MOUSE",
        "UNITATE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de vreme",
      "items": [
        "PLOAIE",
        "ZĂPADĂ",
        "VÂNT",
        "CEAȚĂ"
      ]
    },
    {
      "difficulty": 4,
      "category": "Măsuri de lungime",
      "items": [
        "METRU",
        "KILOMETRU",
        "CENTIMETRU",
        "MILIMETRU"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Planete din Sistemul Solar",
      "items": [
        "MARTE",
        "JUPITER",
        "SATURN",
        "VENUS"
      ]
    },
    {
      "difficulty": 2,
      "category": "Boli comune",
      "items": [
        "RĂCEALĂ",
        "GRIPĂ",
        "ANGINĂ",
        "FEBRĂ"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de transport",
      "items": [
        "MAȘINĂ",
        "AVION",
        "TREN",
        "VAPOR"
      ]
    },
    {
      "difficulty": 4,
      "category": "Tipuri de energie",
      "items": [
        "SOLARĂ",
        "EOLIANĂ",
        "NUCLEARĂ",
        "HIDRO"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Produse lactate",
      "items": [
        "LAPTE",
        "BRÂNZĂ",
        "IAURT",
        "SMÂNTÂNĂ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Articole de îmbrăcăminte",
      "items": [
        "TRICOU",
        "PANTALONI",
        "GEACĂ",
        "PANTIOFI"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de pește",
      "items": [
        "CRAP",
        "ȘTIUCĂ",
        "SOMON",
        "TON"
      ]
    },
    {
      "difficulty": 4,
      "category": "Metode de plată",
      "items": [
        "CASH",
        "CARD",
        "TRANSFER",
        "PAYPAL"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Cărți de joc",
      "items": [
        "TREFLĂ",
        "ROMB",
        "INIMĂ",
        "PICĂ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Funcții matematice",
      "items": [
        "ADUNARE",
        "SCĂDERE",
        "ÎNMULȚIRE",
        "ÎMPĂRȚIRE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de unghiuri",
      "items": [
        "ASCUȚIT",
        "OBTUZ",
        "DREPT",
        "ALUNGIT"
      ]
    },
    {
      "difficulty": 4,
      "category": "Simțuri umane",
      "items": [
        "VĂZ",
        "AUZ",
        "MIROS",
        "GUST"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Insecte comune",
      "items": [
        "ALBINĂ",
        "FURNICĂ",
        "MUSCĂ",
        "ȚÂNȚAR"
      ]
    },
    {
      "difficulty": 2,
      "category": "Copaci din România",
      "items": [
        "FAG",
        "STEJAR",
        "BRAD",
        "PIN"
      ]
    },
    {
      "difficulty": 3,
      "category": "Titluri nobiliare",
      "items": [
        "REGE",
        "DUCE",
        "CONTE",
        "BARON"
      ]
    },
    {
      "difficulty": 4,
      "category": "Culori ale curcubeului",
      "items": [
        "ROȘU",
        "ORANJ",
        "GALBEN",
        "VERDE"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Cereale",
      "items": [
        "GRÂU",
        "PORUMB",
        "ORZ",
        "OVĂZ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Instrumente de suflat",
      "items": [
        "FLAUT",
        "CLARINET",
        "TROMBETĂ",
        "SAXOFON"
      ]
    },
    {
      "difficulty": 3,
      "category": "Părți ale florii",
      "items": [
        "PETALĂ",
        "TULPINĂ",
        "RĂDĂCINĂ",
        "POLEN"
      ]
    },
    {
      "difficulty": 4,
      "category": "Forme geometrice",
      "items": [
        "CERC",
        "PĂTRAT",
        "TRIUNGHI",
        "DREPTUNGHI"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Sinonime pentru \"Frumos\"",
      "items": [
        "SUPERB",
        "MINUNAT",
        "SPLENDID",
        "ATRACTIV"
      ]
    },
    {
      "difficulty": 2,
      "category": "Țări vecine cu România",
      "items": [
        "BULGARIA",
        "SERBIA",
        "UNGARIA",
        "UCRAINA"
      ]
    },
    {
      "difficulty": 3,
      "category": "Băuturi alcoolice",
      "items": [
        "BERE",
        "VIN",
        "VODCĂ",
        "ȚUICĂ"
      ]
    },
    {
      "difficulty": 4,
      "category": "Produse de patiserie",
      "items": [
        "CROISSANT",
        "STRUDEL",
        "MERDENELE",
        "COVRIGI"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Genuri de filme",
      "items": [
        "ACȚIUNE",
        "COMEDIE",
        "DRAMĂ",
        "HORROR"
      ]
    },
    {
      "difficulty": 2,
      "category": "Limbi vorbite",
      "items": [
        "ENGLEZĂ",
        "SPANIOLĂ",
        "MANDARINĂ",
        "HINDI"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de roci",
      "items": [
        "MAGMATICE",
        "SEDIMENTARE",
        "METAMORFICE",
        "BAZALT"
      ]
    },
    {
      "difficulty": 4,
      "category": "Stări ale materiei",
      "items": [
        "SOLID",
        "LICHID",
        "GAZOS",
        "PLASMĂ"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Munți din România",
      "items": [
        "CARPAȚI",
        "FĂGĂRAȘ",
        "RETEZAT",
        "APUSENI"
      ]
    },
    {
      "difficulty": 2,
      "category": "Oceanele lumii",
      "items": [
        "PACIFIC",
        "ATLANTIC",
        "INDIAN",
        "ARCTIC"
      ]
    },
    {
      "difficulty": 3,
      "category": "Zilele săptămânii",
      "items": [
        "LUNI",
        "MARȚI",
        "MIERCURI",
        "JOI"
      ]
    },
    {
      "difficulty": 4,
      "category": "Tipuri de artă",
      "items": [
        "PICTURĂ",
        "SCULPTURĂ",
        "MUZICĂ",
        "TEATRU"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Legume rădăcinoase",
      "items": [
        "MORCOV",
        "ȚELINĂ",
        "PĂSTÂRNAC",
        "SFECLĂ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Componente auto",
      "items": [
        "MOTOR",
        "ROATĂ",
        "VOLAN",
        "FRÂNĂ"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de medicamente",
      "items": [
        "ANALGEZICE",
        "ANTIBIOTICE",
        "VITAMINE",
        "SIROP"
      ]
    },
    {
      "difficulty": 4,
      "category": "Mari deșerturi",
      "items": [
        "SAHARA",
        "GOBI",
        "ATACAMA",
        "KALAHARI"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Tipuri de pădure",
      "items": [
        "CONIFERE",
        "FOIOASE",
        "TROPICALĂ",
        "TAIGA"
      ]
    },
    {
      "difficulty": 2,
      "category": "Sporturi de iarnă",
      "items": [
        "SCHI",
        "PATINAJ",
        "BOB",
        "HOCHEI"
      ]
    },
    {
      "difficulty": 3,
      "category": "Culori de ochi",
      "items": [
        "CĂPRUI",
        "ALBAȘTRI",
        "VERZI",
        "NEGRI"
      ]
    },
    {
      "difficulty": 4,
      "category": "Instrumente de percuție",
      "items": [
        "TOBE",
        "CIMBALE",
        "TAMBURINĂ",
        "XILOFON"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Regizori celebri",
      "items": [
        "SPIELBERG",
        "NOLAN",
        "SCORSESE",
        "TARANTINO"
      ]
    },
    {
      "difficulty": 2,
      "category": "Tipuri de cafea",
      "items": [
        "ESPRESSO",
        "LATTE",
        "CAPPUCCINO",
        "AMERICANO"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de nori",
      "items": [
        "CUMULUS",
        "STRATUS",
        "CIRRUS",
        "NIMBUS"
      ]
    },
    {
      "difficulty": 4,
      "category": "Aparate electrocasnice",
      "items": [
        "FRIGIDER",
        "CUPTOR",
        "MAȘINĂ",
        "ASPIRATOR"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Materiale textile",
      "items": [
        "BUMBAC",
        "MĂTASE",
        "LÂNĂ",
        "POLIESTER"
      ]
    },
    {
      "difficulty": 2,
      "category": "Structuri politice",
      "items": [
        "REPUBLICĂ",
        "MONARHIE",
        "DICTATURĂ",
        "DEMOCRAȚIE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Pietre prețioase",
      "items": [
        "DIAMANT",
        "RUBIN",
        "SAFIR",
        "SMARALD"
      ]
    },
    {
      "difficulty": 4,
      "category": "Tipuri de energie regenerabilă",
      "items": [
        "SOLARĂ",
        "EOLIANĂ",
        "GEOTERMALĂ",
        "BIOMASĂ"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Specii de urs",
      "items": [
        "POLAR",
        "PANDA",
        "GRIZZLY",
        "BRUN"
      ]
    },
    {
      "difficulty": 2,
      "category": "Faze ale vieții",
      "items": [
        "COPILĂRIE",
        "ADOLESCENȚĂ",
        "TINEREȚE",
        "BĂTRÂNEȚE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Zei egipteni",
      "items": [
        "RA",
        "ANUBIS",
        "OSIRIS",
        "ISIS"
      ]
    },
    {
      "difficulty": 4,
      "category": "Unități de memorie",
      "items": [
        "BYTE",
        "KILOBYTE",
        "MEGABYTE",
        "GIGABYTE"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Țări scandinave",
      "items": [
        "SUEDIA",
        "NORVEGIA",
        "DANEMARCA",
        "FINLANDA"
      ]
    },
    {
      "difficulty": 2,
      "category": "Lichide vitale",
      "items": [
        "APĂ",
        "SÂNGE",
        "SEVĂ",
        "LACRIMI"
      ]
    },
    {
      "difficulty": 3,
      "category": "Feluri de mâncare italiene",
      "items": [
        "PIZZA",
        "PASTE",
        "LASAGNA",
        "RISOTTO"
      ]
    },
    {
      "difficulty": 4,
      "category": "Piese de mobilier",
      "items": [
        "PAT",
        "DULAP",
        "SCAUN",
        "MASĂ"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Trupe de rock clasic",
      "items": [
        "BEATLES",
        "QUEEN",
        "ROLLING",
        "ZEPPELIN"
      ]
    },
    {
      "difficulty": 2,
      "category": "Jocuri de noroc",
      "items": [
        "POKER",
        "RULETĂ",
        "BLACKJACK",
        "BACCARAT"
      ]
    },
    {
      "difficulty": 3,
      "category": "Filosofi greci",
      "items": [
        "SOCRATE",
        "PLATON",
        "ARISTOTEL",
        "EPICUR"
      ]
    },
    {
      "difficulty": 4,
      "category": "Forme de relief",
      "items": [
        "MUNTE",
        "DEAL",
        "CÂMPIE",
        "PODIȘ"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Tipuri de case",
      "items": [
        "VILĂ",
        "BLOC",
        "CABANĂ",
        "BORDEL"
      ]
    },
    {
      "difficulty": 2,
      "category": "Tipuri de literatură",
      "items": [
        "POEZIE",
        "PROZĂ",
        "DRAMATURGIE",
        "ESEU"
      ]
    },
    {
      "difficulty": 3,
      "category": "Planete pitice",
      "items": [
        "PLUTO",
        "CERES",
        "ERIS",
        "MAKEMAKE"
      ]
    },
    {
      "difficulty": 4,
      "category": "Mari imperii istorice",
      "items": [
        "ROMAN",
        "OTOMAN",
        "BRITANIC",
        "MONGOL"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Sporturi nautice",
      "items": [
        "ÎNOT",
        "POLO",
        "SURFING",
        "KAYAK"
      ]
    },
    {
      "difficulty": 2,
      "category": "Părți ale corpului",
      "items": [
        "CAP",
        "MÂNĂ",
        "PICIOR",
        "TRUNCHI"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de ochelari",
      "items": [
        "VEDERE",
        "SOARE",
        "PROTECȚIE",
        "3D"
      ]
    },
    {
      "difficulty": 4,
      "category": "Varietăți de mere",
      "items": [
        "IONATAN",
        "GOLDEN",
        "BOT DE IEPURE",
        "GRANNY"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Tipuri de ceasuri",
      "items": [
        "MÂNĂ",
        "PERETE",
        "BUZUNAR",
        "DIGITAL"
      ]
    },
    {
      "difficulty": 2,
      "category": "Funcții în IT",
      "items": [
        "PROGRAMATOR",
        "TESTER",
        "MANAGER",
        "DESIGNER"
      ]
    },
    {
      "difficulty": 3,
      "category": "Boli virale",
      "items": [
        "COVID",
        "GRIPĂ",
        "RUBEOLĂ",
        "RUJEOLĂ"
      ]
    },
    {
      "difficulty": 4,
      "category": "Atracții turistice RO",
      "items": [
        "BRAN",
        "PELEȘ",
        "CORVINILOR",
        "BABELE"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Tipuri de păr",
      "items": [
        "DREPT",
        "CREȚ",
        "ONDULAT",
        "CÂRLIONȚAT"
      ]
    },
    {
      "difficulty": 2,
      "category": "Monștri clasici",
      "items": [
        "VAMPIR",
        "VÂRCOLAC",
        "ZOMBIE",
        "MUMIE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Jocuri video celebre",
      "items": [
        "MINECRAFT",
        "MARIO",
        "TETRIS",
        "GTA"
      ]
    },
    {
      "difficulty": 4,
      "category": "Formate de fișiere",
      "items": [
        "PDF",
        "JPG",
        "MP3",
        "DOCX"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Măsuri de greutate",
      "items": [
        "GRAM",
        "KILOGRAM",
        "TONĂ",
        "MILIGRAM"
      ]
    },
    {
      "difficulty": 2,
      "category": "Rase de câini",
      "items": [
        "CIOBĂNESC",
        "BULLDOG",
        "LABRADOR",
        "BEAGLE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Elemente meteo",
      "items": [
        "TEMPERATURĂ",
        "PRESIUNE",
        "UMIDITATE",
        "VÂNT"
      ]
    },
    {
      "difficulty": 4,
      "category": "Arome de înghețată",
      "items": [
        "VANILIE",
        "CIOCOLATĂ",
        "CĂPȘUNI",
        "FISTIC"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Mărci de telefoane",
      "items": [
        "APPLE",
        "SAMSUNG",
        "XIAOMI",
        "HUAWEI"
      ]
    },
    {
      "difficulty": 2,
      "category": "Tipuri de zbor",
      "items": [
        "COMMERCIAL",
        "CARGO",
        "CHARTER",
        "MILITAR"
      ]
    },
    {
      "difficulty": 3,
      "category": "Culori de păr",
      "items": [
        "BLOND",
        "ȘATEN",
        "BRUNET",
        "ROȘCAT"
      ]
    },
    {
      "difficulty": 4,
      "category": "Bănci din România",
      "items": [
        "BCR",
        "BRD",
        "TRANSILVANIA",
        "RAIFFEISEN"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Băuturi carbogazoase",
      "items": [
        "COLA",
        "FANTA",
        "SPRITE",
        "PEPSI"
      ]
    },
    {
      "difficulty": 2,
      "category": "Tipuri de ferestre",
      "items": [
        "TERMOPAN",
        "LEMN",
        "ALUMINIU",
        "MANSARDĂ"
      ]
    },
    {
      "difficulty": 3,
      "category": "Platforme de streaming",
      "items": [
        "NETFLIX",
        "HBO",
        "DISNEY",
        "AMAZON"
      ]
    },
    {
      "difficulty": 4,
      "category": "Feluri de pizza",
      "items": [
        "MARGHERITA",
        "QUATTRO",
        "CAPRICCIOSA",
        "DIAVOLA"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Măsuri de timp",
      "items": [
        "SECUNDĂ",
        "MINUT",
        "ORĂ",
        "ZI"
      ]
    },
    {
      "difficulty": 2,
      "category": "Părți ale unei zile",
      "items": [
        "DIMINEAȚĂ",
        "PRÂNZ",
        "SEARĂ",
        "NOAPTE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Zboruri spațiale",
      "items": [
        "APOLLO",
        "GEMINI",
        "MERCURY",
        "ARTEMIS"
      ]
    },
    {
      "difficulty": 4,
      "category": "Rețele de supermarketuri",
      "items": [
        "KAUFLAND",
        "LIDL",
        "CARREFOUR",
        "AUCHAN"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Măsuri de volum",
      "items": [
        "LITRU",
        "MILILITRU",
        "DECILITRU",
        "CENTILITRU"
      ]
    },
    {
      "difficulty": 2,
      "category": "Actori români",
      "items": [
        "PINTILIE",
        "CARAMITRU",
        "MĂLĂELE",
        "MORARU"
      ]
    },
    {
      "difficulty": 3,
      "category": "Dinozauri",
      "items": [
        "T-REX",
        "TRICERATOPS",
        "STEGOSAURUS",
        "VELOCIRAPTOR"
      ]
    },
    {
      "difficulty": 4,
      "category": "Echipe de fotbal RO",
      "items": [
        "STEAUA",
        "DINAMO",
        "RAPID",
        "CFR"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Mari pictori",
      "items": [
        "DA VINCI",
        "PICASSO",
        "VAN GOGH",
        "DALI"
      ]
    },
    {
      "difficulty": 2,
      "category": "Tipuri de încălțăminte",
      "items": [
        "ADIDAȘI",
        "PANTOFI",
        "CIZME",
        "SANDALE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Tipuri de biciclete",
      "items": [
        "MTB",
        "CURSIERĂ",
        "BMX",
        "ORĂȘENEASCĂ"
      ]
    },
    {
      "difficulty": 4,
      "category": "Cărți din Biblie",
      "items": [
        "GENEZA",
        "EXODUL",
        "PSALMII",
        "APOCALIPSA"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Zeități romane",
      "items": [
        "JUPITER",
        "NEPTUN",
        "MARTE",
        "VENUS"
      ]
    },
    {
      "difficulty": 2,
      "category": "Boli bacteriene",
      "items": [
        "TUBERCULOZĂ",
        "HOLERĂ",
        "CIUMĂ",
        "TETANOS"
      ]
    },
    {
      "difficulty": 3,
      "category": "Acțiuni la bursă",
      "items": [
        "CUMPĂRĂ",
        "VINDE",
        "PĂSTREAZĂ",
        "DIVIDENT"
      ]
    },
    {
      "difficulty": 4,
      "category": "Componente ale sângelui",
      "items": [
        "PLASMĂ",
        "GLOBULĂ ROȘIE",
        "GLOBULĂ ALBĂ",
        "TROMBOCIT"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Materiale școlare",
      "items": [
        "CAIET",
        "STILOU",
        "PENAR",
        "GHIOZDAN"
      ]
    },
    {
      "difficulty": 2,
      "category": "Genuri literare",
      "items": [
        "EPIC",
        "LIRIC",
        "DRAMATIC",
        "SF"
      ]
    },
    {
      "difficulty": 3,
      "category": "Orașe antice",
      "items": [
        "BABILON",
        "TROIA",
        "SPARTA",
        "ATENA"
      ]
    },
    {
      "difficulty": 4,
      "category": "Pietre de construcție",
      "items": [
        "MARMURĂ",
        "GRANIT",
        "CALCAR",
        "GRESIE"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Tipuri de zăpadă",
      "items": [
        "PULBĂREASĂ",
        "ÎNGHEȚATĂ",
        "TOPOARE",
        "UMEDĂ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Feluri de supă",
      "items": [
        "GĂINĂ",
        "VĂCUȚĂ",
        "ROȘII",
        "RĂDĂCINOASE"
      ]
    },
    {
      "difficulty": 3,
      "category": "Aparate de zbor",
      "items": [
        "ELICOPTER",
        "AVION",
        "PLANOR",
        "ZEPELIN"
      ]
    },
    {
      "difficulty": 4,
      "category": "Părți ale unui calculator",
      "items": [
        "CPU",
        "RAM",
        "GPU",
        "PLACA DE BAZĂ"
      ]
    }
  ],
  [
    {
      "difficulty": 1,
      "category": "Unelte de grădină",
      "items": [
        "SAPĂ",
        "GREBLĂ",
        "LOPATĂ",
        "FURCĂ"
      ]
    },
    {
      "difficulty": 2,
      "category": "Piese auto",
      "items": [
        "BUJIE",
        "CUREA",
        "PISTON",
        "RADIATOR"
      ]
    },
    {
      "difficulty": 3,
      "category": "Simboluri norocoase",
      "items": [
        "TRIFOI",
        "POTCOAVĂ",
        "COȘAR",
        "BUBURUZĂ"
      ]
    },
    {
      "difficulty": 4,
      "category": "Forme de organizare",
      "items": [
        "STAT",
        "PROVINCIE",
        "COMUNĂ",
        "SAT"
      ]
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
