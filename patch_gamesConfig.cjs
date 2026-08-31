const fs = require('fs');
let content = fs.readFileSync('client/src/components/MiniGamesHub.tsx', 'utf8');

content = content.replace(
  `  const gamesConfig = [
    { id: "wordle", type: "WORDLE", name: "1. Wordle", desc: "Cuvântul Săptămânii (6 Litere)", icon: FileText },
    { id: "sudoku", type: "SUDOKU", name: "2. Sudoku", desc: "Criptograma Gotică 6x6", icon: Puzzle },
    { id: "crossword", type: "REBUS", name: "3. Rebus", desc: "Cuvinte Încrucișate", icon: HelpCircle },
    { id: "timeline", type: "TIMELINE", name: "4. Cronologie", desc: "Ordonare Evenimente", icon: ListOrdered },
    { id: "connections", type: "CONNECTIONS", name: "5. Conexiuni", desc: "4 Categorii din 16 Cuvinte", icon: Layers },
    { id: "globle", type: "GLOBLE", name: "6. Ghicește Țara", desc: "Ghicește țara secretă", icon: Compass },
  ];`,
  `  const gamesConfig = [
    { id: "wordle", type: "WORDLE", name: "1. Wordle", desc: "Cuvântul Săptămânii", icon: FileText },
    { id: "sudoku", type: "SUDOKU", name: "2. Sudoku", desc: "Criptograma Gotică", icon: Puzzle },
    { id: "timeline", type: "TIMELINE", name: "3. Cronologie", desc: "Ordonare Evenimente", icon: ListOrdered },
    { id: "connections", type: "CONNECTIONS", name: "4. Conexiuni", desc: "4 Categorii", icon: Layers },
    { id: "globle", type: "GLOBLE", name: "5. Ghicește Țara", desc: "Ghicește țara secretă", icon: Compass },
  ];`
);

content = content.replace('md:grid-cols-6', 'md:grid-cols-5');
content = content.replace('Resetează (0/6)', 'Resetează (0/5)');
content = content.replace('la 0/6', 'la 0/5');

fs.writeFileSync('client/src/components/MiniGamesHub.tsx', content);
