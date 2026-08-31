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
    const FRA = countries.find(c => c.properties.ADMIN === 'France');
    const DEU = countries.find(c => c.properties.ADMIN === 'Germany');
    
    // get center using average of points
    const getCenter = (c) => {
      let sumLats = 0, sumLons = 0, pts = 0;
      c.forEach(pt => { sumLats+=pt[1]; sumLons+=pt[0]; pts++; });
      return {lat: sumLats/pts, lng: sumLons/pts};
    };
    const c1 = extractCoordinates(FRA.geometry);
    const c2 = extractCoordinates(DEU.geometry);
    
    const center1 = getCenter(c1);
    const center2 = getCenter(c2);
    
    console.log('FRA-DEU centerDist:', getDistance(center1.lat, center1.lng, center2.lat, center2.lng));
  });
});
