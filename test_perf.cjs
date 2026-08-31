const https = require('https');

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const extractCoordinates = (geometry) => {
  let coords = [];
  if (!geometry) return coords;
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => coords.push(...ring));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(poly => {
      poly.forEach(ring => coords.push(...ring));
    });
  }
  return coords;
};

https.get('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const countries = JSON.parse(data).features;
    const USA = countries.find(c => c.properties.ADMIN === 'United States of America');
    const RUS = countries.find(c => c.properties.ADMIN === 'Russia');
    
    const c1 = extractCoordinates(USA.geometry);
    const c2 = extractCoordinates(RUS.geometry);
    console.log(c1.length, 'vs', c2.length);
    
    const t0 = performance.now();
    let minD = Infinity;
    // Step size 1
    for (let i = 0; i < c1.length; i++) {
      for (let j = 0; j < c2.length; j++) {
        const d = getDistance(c1[i][1], c1[i][0], c2[j][1], c2[j][0]);
        if (d < minD) minD = d;
      }
    }
    const t1 = performance.now();
    console.log('Brute force time:', t1 - t0, 'ms', 'Dist:', minD);
  });
});
