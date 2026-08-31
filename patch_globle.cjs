const fs = require('fs');
let content = fs.readFileSync('client/src/components/games/GlobleGame.tsx', 'utf8');

const regex = /const getMinPolygonDistance = [\s\S]*?return minD < 60 \? 0 : Math\.round\(minD\); \/\/ border to border\n\};\n/m;

const replacement = `const getMinPolygonDistance = (geom1: any, geom2: any) => {
  const c1 = extractCoordinates(geom1);
  const c2 = extractCoordinates(geom2);
  if (c1.length === 0 || c2.length === 0) return 10000;

  let minD = Infinity;
  for (let i = 0; i < c1.length; i++) {
    for (let j = 0; j < c2.length; j++) {
      const d = getDistance(c1[i][1], c1[i][0], c2[j][1], c2[j][0]);
      if (d < minD) minD = d;
    }
  }
  // The geojson is 110m resolution, so borders can have up to 50-70km gaps in the data points
  return minD < 75 ? 0 : Math.round(minD); 
};
`;

content = content.replace(regex, replacement);

content = content.replace(
  'const dist = getMinPolygonDistance(country.geometry, targetCountry.geometry, centerDist);',
  'const dist = getMinPolygonDistance(country.geometry, targetCountry.geometry);'
);

fs.writeFileSync('client/src/components/games/GlobleGame.tsx', content);
