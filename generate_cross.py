import json

with open("client/src/components/games/valid-words.json", "r", encoding="utf-8") as f:
    words = set([w.upper() for w in json.load(f)])

# Include some common 3 and 4 letter words that might not be in valid-words (which is 5-letters for Wordle!)
extra_words = "CAP TEL COR SARE ETIL SUS SOC UNUL EROI NOI TARE ARAT TARI BANI BAZA BAIE APAR ACEL ACUM CORT CUB CAL DAR DOAR DOI ESTE FAPT GARA GOL GAT IAR JOC JOS LOC LUN LUP MAI MIC NOU OMUL OPT ORA PAS POT ROUA RUP SAC SUNT TIMP UNU ZIUA ACT APA AER ANUL AICI ALBA BINE BUNA BROS BRAT CINE CUM DECI DUPA FARA FATA GURA LUNG MULT MICA NICI NUME PANA PRIN ROST STAU TALE TOAT TINE TATA TREI UNUI VAZ VAL VREO ZICE ZILE".split()

for w in extra_words:
    words.add(w.upper())

w3 = [w for w in words if len(w) == 3]
w4 = [w for w in words if len(w) == 4]
w5 = [w for w in words if len(w) == 5]

print(f"Loaded {len(w3)} 3-letter, {len(w4)} 4-letter, {len(w5)} 5-letter words.")

# Find grids
grids = []
for r2 in w5:
    for r3 in w5:
        c1 = r2[0] + r3[0]
        c2 = r2[1] + r3[1]
        c3 = r2[2] + r3[2]
        
        # We need a 3-letter down for c1: A + c1 => A + r2[0] + r3[0]
        valid_c1s = [w for w in w3 if w.endswith(c1)]
        if not valid_c1s: continue
            
        for r4 in w4:
            c4 = r2[3] + r3[3] + r4[2]
            c5 = r2[4] + r3[4] + r4[3]
            
            # c2 down: B + r2[1] + r3[1] + r4[0] -> 4 letters
            valid_c2s = [w for w in w4 if w[1:3] == c2 and w[3] == r4[0]]
            if not valid_c2s: continue
                
            for r5 in w3:
                # c3 down: C + r2[2] + r3[2] + r4[1] + r5[0] -> 5 letters
                valid_c3s = [w for w in w5 if w[1:3] == c3 and w[3] == r4[1] and w[4] == r5[0]]
                if not valid_c3s: continue
                    
                # c4 down: r2[3] + r3[3] + r4[2] + r5[1] -> 4 letters
                d4 = c4 + r5[1]
                if d4 not in w4: continue
                    
                # c5 down: r2[4] + r3[4] + r4[3] + r5[2] -> 3 letters (Actually down 5 starts at row 2! So it's 4 letters? 
                # NYT Midi Asymmetric:
                # 1 2 3 # #
                # 4 5 6 7 8
                # 9 0 1 2 3
                # # 4 5 6 7
                # # # 8 9 0
                # Col 4 is r2[3], r3[3], r4[2], r5[1] => length 4
                # Col 5 is r2[4], r3[4], r4[3], r5[2] => length 4
                
                d5 = r2[4] + r3[4] + r4[3] + r5[2]
                if d5 not in w4: continue
                    
                for dc1 in valid_c1s:
                    for dc2 in valid_c2s:
                        for dc3 in valid_c3s:
                            # check if across 1 is valid (dc1[0] + dc2[0] + dc3[0])
                            a1 = dc1[0] + dc2[0] + dc3[0]
                            if a1 in w3:
                                grids.append({
                                    "a1": a1, "a2": r2, "a3": r3, "a4": r4, "a5": r5,
                                    "d1": dc1, "d2": dc2, "d3": dc3, "d4": d4, "d5": d5
                                })
                                if len(grids) >= 10:
                                    break
                        if len(grids) >= 10: break
                    if len(grids) >= 10: break
                if len(grids) >= 10: break
            if len(grids) >= 10: break
        if len(grids) >= 10: break
    if len(grids) >= 10: break

for i, g in enumerate(grids):
    print(f"Grid {i+1}:")
    print(f"{g['a1']} # #")
    print(f"{g['a2']}")
    print(f"{g['a3']}")
    print(f"# {g['a4']}")
    print(f"# # {g['a5']}")
    print("Across:", g['a1'], g['a2'], g['a3'], g['a4'], g['a5'])
    print("Down:", g['d1'], g['d2'], g['d3'], g['d4'], g['d5'])
    print("-" * 20)

