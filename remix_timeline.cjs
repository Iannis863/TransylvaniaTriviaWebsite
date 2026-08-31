const fs = require('fs');
let content = fs.readFileSync('client/src/lib/weeklyGames.ts', 'utf8');

// Extract the TIMELINE_SETS string using regex
const match = content.match(/const TIMELINE_SETS = (\[[\s\S]*?\]);\n\nconst CONNECTIONS_SETS/);
if (!match) {
  console.log("Could not find TIMELINE_SETS");
  process.exit(1);
}

const timelineStr = match[1];
const timelineSets = JSON.parse(timelineStr);

// Flatten all events
const allEvents = [];
timelineSets.forEach(set => {
  set.forEach(e => allEvents.push(e));
});

// Since the original raw list was grouped by category (roughly):
// 0-30: Romanian
// 30-70: Global/Wars
// 70-110: Pop Culture / Arts
// 110-150: Science/Tech
// 150-200: Miscellaneous / Sports / Disasters
// We can distribute them evenly into 40 buckets.

const buckets = Array.from({length: 40}, () => []);

// We distribute event i into bucket (i % 40)
for(let i=0; i<allEvents.length; i++) {
  buckets[i % 40].push(allEvents[i]);
}

// Now replace the TIMELINE_SETS in the file
const newTimelineStr = JSON.stringify(buckets, null, 2);
content = content.replace(timelineStr, newTimelineStr);

fs.writeFileSync('client/src/lib/weeklyGames.ts', content);
console.log("Successfully remixed TIMELINE_SETS!");
