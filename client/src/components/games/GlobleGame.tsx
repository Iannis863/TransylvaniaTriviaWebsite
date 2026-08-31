import { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Globe2, Compass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Globe from "react-globe.gl";
import { getCurrentWeeklyGameData } from "../../lib/weeklyGames";
import roCountries from "./ro_countries.json";

interface GlobleGameProps {
  onSolve: (data: any) => void;
  isAlreadySolved?: boolean;
}

// Haversine formula
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};


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

const getMinPolygonDistance = (geom1: any, geom2: any) => {
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

// Calculate compass heading
const getHeading = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const l1 = lat1 * Math.PI / 180;
  const l2 = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(l2);
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  brng = (brng + 360) % 360;
  return brng;
};

// Naive centroid for geojson polygons
const getCentroid = (geometry: any) => {
  let pts = 0, lonSum = 0, latSum = 0;
  const traverse = (coords: any) => {
    if (typeof coords[0] === 'number') {
      lonSum += coords[0];
      latSum += coords[1];
      pts++;
    } else {
      coords.forEach(traverse);
    }
  };
  traverse(geometry.coordinates);
  return { lat: latSum / pts, lng: lonSum / pts };
};

export default function GlobleGame({ onSolve, isAlreadySolved = false }: GlobleGameProps) {
  const { toast } = useToast();
  const [countries, setCountries] = useState<any[]>([]);
  const [guesses, setGuesses] = useState<any[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [isWon, setIsWon] = useState(isAlreadySolved);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const globeRef = useRef<any>(null);

  // Target Country: based on current week
  const weeklyData = getCurrentWeeklyGameData();
  const targetIso = weeklyData.globleTarget;

  useEffect(() => {
    // Fetch world geojson
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => {
        // Pre-compute centroids and apply Romanian translations
        const enhanced = data.features.map((f: any) => {
          const iso = f.properties.ISO_A3;
          const admin = f.properties.ADMIN;
          // @ts-ignore
          const translatedName = roCountries[iso] || roCountries[admin] || admin;
          return {
            ...f,
            centroid: getCentroid(f.geometry),
            name: translatedName
          };
        });
        setCountries(enhanced);
      });
  }, []);

  const targetCountry = useMemo(() => countries.find(c => c.properties.ISO_A3 === targetIso), [countries]);

  const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  useEffect(() => {
    if (currentGuess.length > 1) {
      const lower = normalizeStr(currentGuess);
      const matches = countries.filter(c => normalizeStr(c.name).includes(lower));
      setSuggestions(matches.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [currentGuess, countries]);

  const submitGuess = (country: any) => {
    if (isWon || !targetCountry) return;
    if (guesses.find(g => g.properties.ISO_A3 === country.properties.ISO_A3)) {
      toast({ title: "Deja încercat", description: "Ai ghicit deja această țară.", variant: "destructive" });
      return;
    }

    const centerDist = getDistance(country.centroid.lat, country.centroid.lng, targetCountry.centroid.lat, targetCountry.centroid.lng);
    const dist = getMinPolygonDistance(country.geometry, targetCountry.geometry);
    country.distance = dist; // store it
    const heading = getHeading(country.centroid.lat, country.centroid.lng, targetCountry.centroid.lat, targetCountry.centroid.lng);
    
    const newGuess = { ...country, dist, heading };
    const newGuesses = [newGuess, ...guesses];
    setGuesses(newGuesses);
    setCurrentGuess("");
    setSuggestions([]);

    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: country.centroid.lat, lng: country.centroid.lng, altitude: 1.5 }, 1000);
    }

    if (country.properties.ISO_A3 === targetIso) {
      setIsWon(true);
      toast({ title: "🎉 Corect!", description: `Țara este ${targetCountry.name}!` });
      onSolve({ completed: true });
    }
  };

  const getPolygonColor = (feat: any) => {
    // If target is found (or rendering the target itself)
    if (feat.properties.ISO_A3 === targetIso && isWon) return 'rgba(153, 27, 27, 0.9)'; // Dark Red (Tailwind red-800)
    
    const guessed = guesses.find(g => g.properties.ISO_A3 === feat.properties.ISO_A3);
    if (!guessed) return 'rgba(100, 100, 100, 0.1)'; // default invisible
    
    if (feat.properties.ISO_A3 === targetIso) return 'rgba(153, 27, 27, 0.9)'; // found it!
    
    const d = guessed.distance;
    
    // Scheme: Dark Blue -> Light Blue -> Yellow -> Orange -> Bright Red -> Dark Red (adjacent)
    if (d <= 50) return 'rgba(153, 27, 27, 0.9)'; // Adjacent: Dark Red
    if (d < 1500) return 'rgba(239, 68, 68, 0.8)'; // Bright Red
    if (d < 3500) return 'rgba(249, 115, 22, 0.8)'; // Orange
    if (d < 6000) return 'rgba(234, 179, 8, 0.7)'; // Yellow
    if (d < 9000) return 'rgba(56, 189, 248, 0.6)'; // Light Blue
    return 'rgba(30, 58, 138, 0.6)'; // Dark Blue
  };

  const getArrow = (heading: number) => {
    const arrows = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];
    const index = Math.round(heading / 45) % 8;
    return arrows[index];
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto w-full">
      <div className="text-center mb-4">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs mb-1">
          Ghicește Țara
        </Badge>
        <p className="text-xs text-purple-300/80">Introdu o țară. Culorile calde înseamnă că ești mai aproape!</p>
      </div>

      <div className="w-full aspect-square sm:aspect-video bg-[#000010] rounded-xl border-2 border-purple-800/50 shadow-xl overflow-hidden mb-4 relative flex items-center justify-center cursor-move">
        {countries.length === 0 ? (
          <div className="text-purple-400 text-sm animate-pulse">Se încarcă globul...</div>
        ) : (
          <Globe
            ref={globeRef}
            width={400}
            height={300}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            polygonsData={countries}
            polygonAltitude={0.01}
            polygonCapColor={getPolygonColor}
            polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
            polygonStrokeColor={() => '#111'}
            polygonsTransitionDuration={300}
            backgroundColor="#000010"
          />
        )}
      </div>

      {!isWon && (
        <div className="w-full relative mb-4 z-50">
          <Input 
            value={currentGuess}
            onChange={(e) => setCurrentGuess(e.target.value)}
            placeholder="Numele țării (ex: Franța, România)..."
            className="bg-purple-950/60 border-purple-700 text-white placeholder:text-purple-400/50"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-purple-900 border border-purple-700 rounded-md mt-1 shadow-2xl overflow-hidden">
              {suggestions.map(s => (
                <div 
                  key={s.properties.ISO_A3} 
                  className="p-2 text-sm text-purple-100 hover:bg-purple-800 cursor-pointer"
                  onClick={() => submitGuess(s)}
                >
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guesses log */}
      <div className="w-full space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {guesses.map((g, idx) => (
          <div key={g.properties.ISO_A3} className="w-full p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-sm flex items-center justify-between shadow-inner">
            <span className="font-bold text-purple-200">{g.name}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-amber-400/80">{Math.round(g.dist).toLocaleString()} km</span>
              <span className="text-lg">{getArrow(g.heading)}</span>
            </div>
          </div>
        ))}
      </div>

      {isWon && (
        <div className="w-full p-3 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Țara ghicită: {targetCountry?.name}
        </div>
      )}
    </div>
  );
}
