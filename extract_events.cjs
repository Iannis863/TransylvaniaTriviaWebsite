const fs = require('fs');
let content = fs.readFileSync('client/src/lib/weeklyGames.ts', 'utf8');

const match = content.match(/const TIMELINE_SETS = (\[[\s\S]*?\]);\n\nconst CONNECTIONS_SETS/);
const timelineSets = JSON.parse(match[1]);

let allEvents = [];
timelineSets.forEach(set => {
  set.forEach(e => {
    allEvents.push(e.content);
  });
});

fs.writeFileSync('all_events.txt', allEvents.join('\n'));
