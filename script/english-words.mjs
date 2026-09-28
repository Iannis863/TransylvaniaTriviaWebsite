// Regenerate with: node script/english-words.mjs
import wordListPath from 'word-list';
import { readFileSync, writeFileSync } from 'node:fs';
const words = readFileSync(wordListPath, 'utf8').split('\n').filter(word => /^[a-z]{5}$/.test(word)).map(word => word.toUpperCase());
writeFileSync('client/src/components/games/valid-words-en.json', JSON.stringify(words) + '\n');
