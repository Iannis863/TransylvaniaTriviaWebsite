import { bucharestParts, bucharestDateKey, eventDateInBucharest } from "./event-time.js";
export interface ScheduleEdition {
  id: string;
  year?: number;
  seasonNumber: number;
  seasonName: string;
  editionNumber: number; // 1 to 15
  monthName: string;
  dayOfMonth: number;
  monthIndex: number; // 0-11
  yearOffset: number; // 0 for year 1 (Oct-Dec), 1 for next year (Jan-May)
  theme: string;
  description: string;
  secretClue: string;
  maxTeams: number;
}

export interface SeasonInfo {
  number: number;
  name: string;
  totalEditions: number;
  months: string[];
  editions: ScheduleEdition[];
}

// 1. Predefined Season 1 Schedule (15 Editions)
// Oct: 6, 13, 20, 27 | Nov: 3, 10, 17, 24 | Dec: 1, 8, 15 | Jan: 5, 12, 19, 26
export const SEASON_1_SCHEDULE: Omit<ScheduleEdition, "id">[] = [
  // Octombrie (4 editions)
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 1, monthName: "Octombrie", dayOfMonth: 6, monthIndex: 9, yearOffset: 0, theme: "Marea Deschidere: Legendele Transilvaniei", description: "Începem noul sezon cu istorie, mituri și mistere locale.", secretClue: "Seriale explicate prost", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 2, monthName: "Octombrie", dayOfMonth: 13, monthIndex: 9, yearOffset: 0, theme: "Cinema Cult & Seriale Horror", description: "Capodopere cinematografice, regizori vizionari și scene de neuitat.", secretClue: "Ghicește animalul după radiografie", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 3, monthName: "Octombrie", dayOfMonth: 20, monthIndex: 9, yearOffset: 0, theme: "Muzica Anilor '80 & '90", description: "Hituri nemuritoare, versuri de continuat și ritmuri nostalgice.", secretClue: "Ce s-a întâmplat aici?", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 4, monthName: "Octombrie", dayOfMonth: 27, monthIndex: 9, yearOffset: 0, theme: "Ediție Specială: Noaptea de Halloween", description: "Costume, mistere oculte, castele bântuite și miză dublă!", secretClue: "Cine este în această poză?", maxTeams: 10 },
  // Noiembrie (4 editions)
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 5, monthName: "Noiembrie", dayOfMonth: 3, monthIndex: 10, yearOffset: 0, theme: "Știință, Univers & Tehnologie", description: "De la astronomie la inteligență artificială și explorare spațială.", secretClue: "Unde în lume?", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 6, monthName: "Noiembrie", dayOfMonth: 10, monthIndex: 10, yearOffset: 0, theme: "Geografia Lumii & Marile Capitale", description: "Munți uriași, oceane adânci și recorduri geografice uimitoare.", secretClue: "Ghicește filmul după emoji-uri.", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 7, monthName: "Noiembrie", dayOfMonth: 17, monthIndex: 10, yearOffset: 0, theme: "Gamer's Vault: Jocuri Video & Pop Culture", description: "Lumi virtuale, eroi pixelati și benzi desenate iconice.", secretClue: "Ghicește obiectul mărit", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 8, monthName: "Noiembrie", dayOfMonth: 24, monthIndex: 10, yearOffset: 0, theme: "Literatură & Mitologie Universală", description: "Panteonul zeilor greci, nordici și marile opere literare ale lumii.", secretClue: "Cine e artistul după numele real", maxTeams: 10 },
  // Decembrie (3 editions)
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 9, monthName: "Decembrie", dayOfMonth: 1, monthIndex: 11, yearOffset: 0, theme: "Ediție de Ziua Națională: Istoria României", description: "Voievozi, tratate istorice, invenții românești și cultură autentică.", secretClue: "Istoria României", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 10, monthName: "Decembrie", dayOfMonth: 8, monthIndex: 11, yearOffset: 0, theme: "Gastronomie Mondială & Licori Magice", description: "Rețete secrete, tradiții culinare globale și băuturi legendare.", secretClue: "Ghicește țara după graniță", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 11, monthName: "Decembrie", dayOfMonth: 15, monthIndex: 11, yearOffset: 0, theme: "Gala de Crăciun & Marele Jackpot de Iarnă", description: "Sărbătoare, tombolă cu premii uriașe și atmosferă de poveste.", secretClue: "Ghicește limba după expresie.", maxTeams: 10 },
  // Ianuarie (4 editions)
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 12, monthName: "Ianuarie", dayOfMonth: 5, monthIndex: 0, yearOffset: 1, theme: "Restart de An Nou: Recorduri Mondiale", description: "Performanțe incredibile, curiozități bizare și statistici șocante.", secretClue: "Ghicește personalitatea după pagina Wikipedia", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 13, monthName: "Ianuarie", dayOfMonth: 12, monthIndex: 0, yearOffset: 1, theme: "Anii 2000 & Nostalgia Copilăriei", description: "Desene animate Cartoon Network, primele telefoane mobile și hituri pop.", secretClue: "Care eveniment a avut loc primul?", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 14, monthName: "Ianuarie", dayOfMonth: 19, monthIndex: 0, yearOffset: 1, theme: "Arhitectură, Artă & Capodopere", description: "Renașterea, sculptori celebri, muzee celebre și monumente impunătoare.", secretClue: "Lumi din Jocurile Video.", maxTeams: 10 },
  { seasonNumber: 1, seasonName: "Sezonul 1 (Toamnă - Iarnă)", editionNumber: 15, monthName: "Ianuarie", dayOfMonth: 26, monthIndex: 0, yearOffset: 1, theme: "Marea Finală a Sezonului 1: Încoronarea Campionilor", description: "Ultima bătălie a sezonului cu trofeul suprem și premii speciale!", secretClue: "Sporturi explicate prost", maxTeams: 10 },
];

// 2. Predefined Season 2 Schedule (15 Editions)
// Feb: 2, 9, 16, 23 | Mar: 2, 9, 16, 23 | Apr: 6, 13, 20, 27 | May: 11, 18, 25
export const SEASON_2_SCHEDULE: Omit<ScheduleEdition, "id">[] = [
  // Februarie (4 editions)
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 1, monthName: "Februarie", dayOfMonth: 2, monthIndex: 1, yearOffset: 1, theme: "Start Sezonul 2: Noua Provocare", description: "Echipe noi, rivalități renăscute și întrebări proaspete.", secretClue: "Indiciu Secret: Februarie a fost adăugată în calendarul roman de Numa Pompilius.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 2, monthName: "Februarie", dayOfMonth: 9, monthIndex: 1, yearOffset: 1, theme: "Cinematografia Europeană & Premiile Oscar", description: "Filme premiate, actori legendari și coloane sonore celebre.", secretClue: "Indiciu Secret: Statueta Oscar este placată cu aur de 24 de carate.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 3, monthName: "Februarie", dayOfMonth: 16, monthIndex: 1, yearOffset: 1, theme: "Dragoste, Pasiune & Tragedii Istorice", description: "Cupluri celebre din istorie, literatură și mitologie.", secretClue: "Indiciu Secret: Povestea lui Romeo și Julieta a fost inspirată dintr-o legendă italiană mai veche.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 4, monthName: "Februarie", dayOfMonth: 23, monthIndex: 1, yearOffset: 1, theme: "Băuturi Fine, Vinuri & Istoria Berii", description: "Curiozități despre fabricarea berii, regiuni viticole și cocktailuri.", secretClue: "Indiciu Secret: Cea mai veche berărie din lume funcționează continuu din anul 1040 (Weihenstephan).", maxTeams: 10 },
  // Martie (4 editions)
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 5, monthName: "Martie", dayOfMonth: 2, monthIndex: 2, yearOffset: 1, theme: "Mărțișor & Femei Excepționale din Istorie", description: "Pioniere ale științei, regine puternice și artiste geniale.", secretClue: "Indiciu Secret: Marie Curie este singura persoană cu premii Nobel în două științe diferite.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 6, monthName: "Martie", dayOfMonth: 9, monthIndex: 2, yearOffset: 1, theme: "Rock Legends & Festivaluri Mondiale", description: "Solo-uri celebre, trupe legendare și istoria festivalurilor rock.", secretClue: "Indiciu Secret: Festivalul Woodstock original a avut loc în august 1969.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 7, monthName: "Martie", dayOfMonth: 16, monthIndex: 2, yearOffset: 1, theme: "Animale Sălbatice & Secretele Naturii", description: "Ecosisteme fascinante, specii rare și comportamente animale incredibile.", secretClue: "Indiciu Secret: Inima unei balene albastre poate cântări până la 180 kg.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 8, monthName: "Martie", dayOfMonth: 23, monthIndex: 2, yearOffset: 1, theme: "Spionaj, Războaie Secrete & Coduri Enigma", description: "Agenți dubli, mesaje cifrate și operațiuni care au schimbat soarta lumii.", secretClue: "Indiciu Secret: Alan Turing a spart cifrul Enigma la Bletchley Park.", maxTeams: 10 },
  // Aprilie (4 editions)
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 9, monthName: "Aprilie", dayOfMonth: 6, monthIndex: 3, yearOffset: 1, theme: "Farse, Păcăleli & Mari Escrocherii Istorice", description: "Cele mai ingenioase iluzii și momente amuzante din istorie.", secretClue: "Indiciu Secret: Turnul Eiffel a fost 'vândut' la fier vechi de două ori de escrocul Victor Lustig.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 10, monthName: "Aprilie", dayOfMonth: 13, monthIndex: 3, yearOffset: 1, theme: "Mari Bătălii & Strategii Militare", description: "De la Termopile și Waterloo la marile conflicte moderne.", secretClue: "Indiciu Secret: Alexandru cel Mare nu a pierdut nicio bătălie în timpul campaniilor sale.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 11, monthName: "Aprilie", dayOfMonth: 20, monthIndex: 3, yearOffset: 1, theme: "Universul Sci-Fi: Star Wars, Dune & Matrix", description: "Galaxii îndepărtate, roboți conștienți și viitoruri distopice.", secretClue: "Indiciu Secret: Limba Klingoniană are o gramatică completă creată de un lingvist.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 12, monthName: "Aprilie", dayOfMonth: 27, monthIndex: 3, yearOffset: 1, theme: "Comedii Clasice, Sitcom-uri & Stand-up", description: "Friends, Seinfeld, The Office și glume nemuritoare.", secretClue: "Indiciu Secret: Celebrul duel cu 'Pivot!' din Friends a fost improvizat parțial.", maxTeams: 10 },
  // Mai (3 editions)
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 13, monthName: "Mai", dayOfMonth: 11, monthIndex: 4, yearOffset: 1, theme: "Călătorii Globale & Trasee Legendare", description: "Drumul Mătăsii, Orient Express și exploratori curajoși.", secretClue: "Indiciu Secret: Marco Polo a petrecut 24 de ani călătorind în Asia.", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 14, monthName: "Mai", dayOfMonth: 18, monthIndex: 4, yearOffset: 1, theme: "Semifinala Sezonului 2: Presiunea Maximă", description: "Penultima rundă înaintea finalei mari - bătălia pentru podium.", secretClue: "Indiciu Secret: Fiecare punct obținut în Joker poate asigura calificarea!", maxTeams: 10 },
  { seasonNumber: 2, seasonName: "Sezonul 2 (Primăvară)", editionNumber: 15, monthName: "Mai", dayOfMonth: 25, monthIndex: 4, yearOffset: 1, theme: "Marea Finală a Sezonului 2 & Trofeul Absolut", description: "Spectacol total, festivitatea de premiere și încheierea glorioasă a sezonului.", secretClue: "Indiciu Secret: Campionii Sezonului 2 intră în Galeria Gloriei Transilvania Trivia!", maxTeams: 10 },
];

/**
 * Calculates concrete calendar dates for all editions based on the base year.
 */
export function getFullSchedule(baseYear: number = bucharestParts(new Date()).year, referenceDate: Date = new Date()): ScheduleEdition[] {
  // If current month is Jan-May, baseYear starts from previous year (Oct of baseYear - 1)
  const currentMonth = bucharestParts(referenceDate).month - 1;
  const academicBaseYear = currentMonth < 6 ? baseYear - 1 : baseYear;

  const s1 = SEASON_1_SCHEDULE.map((item) => {
    const year = academicBaseYear + item.yearOffset;
    const id = `${academicBaseYear === 2026 ? "" : `${academicBaseYear}-`}s1-e${item.editionNumber}`;
    return {
      ...item,
      id,
      year,
    };
  });

  const s2 = SEASON_2_SCHEDULE.map((item) => {
    const year = academicBaseYear + item.yearOffset;
    const id = `${academicBaseYear === 2026 ? "" : `${academicBaseYear}-`}s2-e${item.editionNumber}`;
    return {
      ...item,
      id,
      year,
    };
  });

  return [...s1, ...s2];
}

export function getEditionDateTime(edition: ScheduleEdition, baseYear?: number): Date {
  const now = bucharestParts(new Date());
  const academicBaseYear = now.month <= 6 ? (baseYear ?? now.year) - 1 : (baseYear ?? now.year);
  return eventDateInBucharest(edition.year ?? academicBaseYear + edition.yearOffset, edition.monthIndex, edition.dayOfMonth);
}

export interface ActiveEditionState {
  currentEdition: ScheduleEdition;
  eventDate: Date;
  formattedDate: string;
  formattedTime: string;
  seasonName: string;
  seasonNumber: number;
  editionNumber: number;
  totalEditions: number;
  theme: string;
  secretClue: string;
  isHappeningToday: boolean;
  isHappeningNow: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  totalSecondsRemaining: number;
  allEditions: ScheduleEdition[];
}

/**
 * Automatically computes the Next/Current Active Edition based on the schedule and system time.
 */
export function getCurrentOrNextEdition(now: Date = new Date()): ActiveEditionState {
  const allEditions = getFullSchedule(bucharestParts(now).year, now);
  
  // Find all upcoming editions where event time is in the future or within the active 4-hour window
  const editionsWithDates = allEditions.map((ed) => {
    const eventDate = getEditionDateTime(ed, now.getFullYear());
    // Active window: until 24:00 (midnight) on the event night
    const endWindow = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);
    return {
      edition: ed,
      eventDate,
      endWindow,
      diffMs: eventDate.getTime() - now.getTime(),
    };
  });

  // Sort chronologically
  editionsWithDates.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  // Find the first edition whose endWindow is >= now
  let chosen = editionsWithDates.find((item) => item.endWindow.getTime() >= now.getTime());

  // If all are in the past (e.g. end of May), wrap around to Season 1 Edition 1 of next cycle
  if (!chosen) {
    const nextYearEditions = getFullSchedule(bucharestParts(now).year + 1, now);
    const firstEd = nextYearEditions[0];
    const eventDate = getEditionDateTime(firstEd, now.getFullYear() + 1);
    chosen = {
      edition: firstEd,
      eventDate,
      endWindow: new Date(eventDate.getTime() + 4 * 60 * 60 * 1000),
      diffMs: eventDate.getTime() - now.getTime(),
    };
  }

  const { edition, eventDate } = chosen;
  const diffMs = eventDate.getTime() - now.getTime();
  const isHappeningToday = bucharestDateKey(now) === bucharestDateKey(eventDate);
  const isHappeningNow = diffMs <= 0 && now.getTime() <= chosen.endWindow.getTime();

  const totalSecondsRemaining = Math.max(0, Math.floor(diffMs / 1000));
  const daysRemaining = Math.floor(totalSecondsRemaining / (3600 * 24));
  const hoursRemaining = Math.floor((totalSecondsRemaining % (3600 * 24)) / 3600);
  const minutesRemaining = Math.floor((totalSecondsRemaining % 3600) / 60);
  const secondsRemaining = totalSecondsRemaining % 60;

  const monthNamesRo = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
  ];

  const weekday = new Intl.DateTimeFormat("ro-RO", { weekday: "long", timeZone: "Europe/Bucharest" }).format(eventDate);
  const formattedDate = `${weekday[0].toUpperCase() + weekday.slice(1)}, ${edition.dayOfMonth} ${monthNamesRo[edition.monthIndex]} ${bucharestParts(eventDate).year}`;
  const formattedTime = "20:00";

  return {
    currentEdition: edition,
    eventDate,
    formattedDate,
    formattedTime,
    seasonName: edition.seasonName,
    seasonNumber: edition.seasonNumber,
    editionNumber: edition.editionNumber,
    totalEditions: 15,
    theme: edition.theme,
    secretClue: edition.secretClue,
    isHappeningToday,
    isHappeningNow,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    totalSecondsRemaining,
    allEditions,
  };
}
