const fs = require('fs');
let content = fs.readFileSync('client/src/lib/weeklyGames.ts', 'utf8');

const newTimelineSets = `const TIMELINE_SETS = [
  [
    { id: "t1", content: "Marea Unire de la Alba Iulia", year: 1918 },
    { id: "t2", content: "Aterizarea pe Lună", year: 1969 },
    { id: "t3", content: "Lansarea primului iPhone", year: 2007 },
    { id: "t4", content: "Căderea Zidului Berlinului", year: 1989 },
    { id: "t5", content: "Scufundarea Titanicului", year: 1912 },
  ],
  [
    { id: "t6", content: "Intrarea României în Uniunea Europeană", year: 2007 },
    { id: "t7", content: "Crearea Google", year: 1998 },
    { id: "t8", content: "Asasinarea lui JFK", year: 1963 },
    { id: "t9", content: "Primul film Star Wars", year: 1977 },
    { id: "t10", content: "Invenția World Wide Web (WWW)", year: 1989 },
  ],
  [
    { id: "t11", content: "Revoluția Română", year: 1989 },
    { id: "t12", content: "Lansarea Facebook", year: 2004 },
    { id: "t13", content: "Avatar ajunge în cinematografe", year: 2009 },
    { id: "t14", content: "Sfârșitul Primului Război Mondial", year: 1918 },
    { id: "t15", content: "Fondarea Microsoft", year: 1975 },
  ],
  [
    { id: "t16", content: "Mica Unire (Unirea Principatelor Române)", year: 1859 },
    { id: "t17", content: "Lansarea filmului The Matrix", year: 1999 },
    { id: "t18", content: "Descoperirea penicilinei", year: 1928 },
    { id: "t19", content: "Primul zbor al fraților Wright", year: 1903 },
    { id: "t20", content: "Atentatele din 11 septembrie", year: 2001 },
  ]
];`;

// We need to replace the old TIMELINE_SETS with the new one.
// Let's use a regex to match from "const TIMELINE_SETS = [" to "];" right before "const CONNECTIONS_SETS"
content = content.replace(/const TIMELINE_SETS = \[\s+\[[\s\S]*?\]\n\];/, newTimelineSets);

fs.writeFileSync('client/src/lib/weeklyGames.ts', content);
