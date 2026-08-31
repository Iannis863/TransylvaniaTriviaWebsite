const fs = require('fs');
let content = fs.readFileSync('client/src/components/games/GlobleGame.tsx', 'utf8');

const distLogic = `
const extractCoordinates = (geometry: any): number[][] => {
  let coords: number[][] = [];
  if (!geometry) return coords;
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring: any) => coords.push(...ring));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((poly: any) => {
      poly.forEach((ring: any) => coords.push(...ring));
    });
  }
  return coords;
};

const getMinPolygonDistance = (geom1: any, geom2: any, centerDist: number) => {
  // If centroids are very far apart, don't bother doing expensive vertex check
  if (centerDist > 2000) return centerDist;

  const c1 = extractCoordinates(geom1);
  const c2 = extractCoordinates(geom2);
  if (c1.length === 0 || c2.length === 0) return centerDist;

  let minD = Infinity;
  // Step size for vertex check to maintain high performance
  const step1 = Math.max(1, Math.floor(c1.length / 50));
  const step2 = Math.max(1, Math.floor(c2.length / 50));
  
  for (let i = 0; i < c1.length; i += step1) {
    for (let j = 0; j < c2.length; j += step2) {
      // GeoJSON is [longitude, latitude]
      const d = getDistance(c1[i][1], c1[i][0], c2[j][1], c2[j][0]);
      if (d < minD) minD = d;
    }
  }
  return minD < 60 ? 0 : Math.round(minD); // border to border
};
`;

content = content.replace('// Calculate compass heading', distLogic + '\n// Calculate compass heading');

content = content.replace(
  'const dist = getDistance(country.centroid.lat, country.centroid.lng, targetCountry.centroid.lat, targetCountry.centroid.lng);',
  'const centerDist = getDistance(country.centroid.lat, country.centroid.lng, targetCountry.centroid.lat, targetCountry.centroid.lng);\n    const dist = getMinPolygonDistance(country.geometry, targetCountry.geometry, centerDist);\n    country.distance = dist; // store it'
);

fs.writeFileSync('client/src/components/games/GlobleGame.tsx', content);
