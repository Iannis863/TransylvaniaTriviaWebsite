const fs = require('fs');
let content = fs.readFileSync('client/src/components/games/TimelineGame.tsx', 'utf8');

const replacement = `  const handleRestart = () => {
    const initialEvent = ALL_EVENTS.length > 0 ? ALL_EVENTS[Math.floor(ALL_EVENTS.length / 2)] : null;
    const remainingEvents = ALL_EVENTS.filter(e => e.id !== initialEvent?.id).sort(() => Math.random() - 0.5);
    setPlacedEvents(initialEvent ? [initialEvent] : []);
    setUpcomingEvents(remainingEvents);
    setLives(3);
    setIsLost(false);
  };`;

content = content.replace(/const handleRestart = \(\) => {[\s\S]*?setIsLost\(false\);\n  };/, replacement);
fs.writeFileSync('client/src/components/games/TimelineGame.tsx', content);
