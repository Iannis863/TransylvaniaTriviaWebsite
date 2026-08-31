w3 = "CAP,TEL,COR,DOC,AER,ACT,APA,BUN,CAR,CUB,DAR,DOR,DUI,DOI,EST,ERA,FOC,GOL,ION,JOC,LUP,MAC,MAI,MIC,NAS,NOU,OPT,OMU,PAS,PAT,POT,RAU,ROZ,SAC,SOC,SAH,SUD,SUS,TAI,TIC,UNT,UNU,URA,VAL,VAS,ZID".split(',')
w4 = "TARE,ARAT,SARE,ETIL,ACEL,ACUM,APAR,BAIE,BANI,BATA,CASA,CINE,CORT,DATA,DECI,DOAR,DUPA,FAPT,FATA,GARA,GURA,LUNG,LUNA,MARE,MICA,MULT,NOUA,NUME,PANA,PRIN,ROST,STAU,TATA,TINE,TOAT,TREI,UNUL,VALE,ZICE,ZILE,POST,BINE,CERU".split(',')
w5 = "ORASE,RASAT,ARENA,PIESE,PARTE,CARTE,BAIEI,FRATE,POARTA,NOAPTE,LUMEA,SOARE,INIMA,ZIUAA,NEGRU,MOALE,DULCE,AMARU,GREOI,ROATA,PUNCT,PRIMA,LOCUL,TIMPU,NIMIC,DOARE,TRECE,VALEA,VREAU,IAZUL,NOROC,GLOBE,MASCA,CRIMA,ALIBI,UMBRA,ZMEUL,SPATE".split(',')

grids = []
for r2 in w5:
    for r3 in w5:
        c1 = r2[0] + r3[0]
        valid_c1s = [w for w in w3 if w.endswith(c1)]
        if not valid_c1s: continue
        for r4 in w4:
            c4 = r2[3] + r3[3] + r4[2]
            c5 = r2[4] + r3[4] + r4[3]
            valid_c2s = [w for w in w4 if w[1:3] == (r2[1] + r3[1]) and w[3] == r4[0]]
            if not valid_c2s: continue
            for r5 in w3:
                valid_c3s = [w for w in w5 if w[1:3] == (r2[2] + r3[2]) and w[3] == r4[1] and w[4] == r5[0]]
                if not valid_c3s: continue
                d4 = c4 + r5[1]
                if d4 not in w4: continue
                d5 = r2[4] + r3[4] + r4[3] + r5[2]
                if d5 not in w4: continue
                for dc1 in valid_c1s:
                    for dc2 in valid_c2s:
                        for dc3 in valid_c3s:
                            a1 = dc1[0] + dc2[0] + dc3[0]
                            if a1 in w3:
                                grids.append({
                                    "a1": a1, "a2": r2, "a3": r3, "a4": r4, "a5": r5,
                                    "d1": dc1, "d2": dc2, "d3": dc3, "d4": d4, "d5": d5
                                })

for i, g in enumerate(grids[:10]):
    print(f"Grid {i+1}: Across: {g['a1']}, {g['a2']}, {g['a3']}, {g['a4']}, {g['a5']}")
    print(f"Down: {g['d1']}, {g['d2']}, {g['d3']}, {g['d4']}, {g['d5']}")

