import json, os
from voices import OUT
if os.path.exists('voices_norm.json'):
    for _k,_u in json.load(open('voices_norm.json')).items():
        if _k in OUT: OUT[_k]['voice']=_u
img={l.split()[0]:l.split()[1] for l in open('images.txt')}
foc={"s1":"center","s2":"center","s3":"center","s4":"top","s5":"center","s6":"top","s7":"center","s8":"center"}
spec={
 "topic":"KJ Muldoon (geb. Aug 2024, Philadelphia, CPS1-Mangel) bekommt 2025 an CHOP/Penn als erster Mensch eine maßgeschneiderte Base-Editing-Therapie (in ~6 Monaten gebaut, 1. Dosis Feb 2025, 3 Dosen); Juni 2025 nach Hause",
 "pillar":"B",
 "title":"Doctors Built a Gene Editor for One Baby. It Worked.",
 "cta":"WOULD YOU SAY YES?",
 "description":"KJ Muldoon was born in Philadelphia in August 2024 with CPS1 deficiency, a rare disease that lets toxic ammonia build up in the blood. Doctors at Children's Hospital of Philadelphia and Penn Medicine built a personalized base-editing therapy for his exact mutation in about six months. He got his first dose in February 2025 and went home in June 2025.\n\nIf it were your baby, would you say yes? 🔔 Follow for the next true story.\n#shorts #science #crispr #medicine #truestory",
 "tags":"KJ Muldoon CRISPR base editing gene therapy CHOP Penn Medicine CPS1 science medicine truestory",
 "sources":["https://www.pennmedicine.org/news/worlds-first-patient-treated-with-personalized-crispr-therapy",
  "https://thepenngazette.com/crisprs-first-custom-cure/",
  "https://www.fox29.com/news/baby-kj-muldoon-returns-home"],
 "voice_name":"Brian","mood":"curious",
 "hook":{"image":img['hook'],"image2":img['image2'],"voice":OUT['hook']['voice'],"timestamps":OUT['hook']['timestamps'],
   "narration":OUT['hook']['narration'],"turn_word":"It","line1":"MADE FOR\nONE BABY","line2":"ONE LETTER FIXED."},
 "scenes":[],
 "keywords":{"red":["poison","survive","typo","home","personal"],"yellow":["2024","2025","half","six","two","june","one"]},
 "sound":{"opener":"punch","whooshes":["wh_soft","whoosh_1","wh_deep","wh_reverse"],"impact":"impact_box","climax":None,"riser":None,"timeskip":None},
 "music":"PLACEHOLDER","music_prompt":"",
}
for k in ['s1','s2','s3','s4','s5','s6','s7','s8']:
    spec["scenes"].append({"image":img[k],"voice":OUT[k]['voice'],"timestamps":OUT[k]['timestamps'],"narration":OUT[k]['narration'],"focus":foc[k]})
try:
    extra=json.load(open('extra.json'))
    for k,v in extra.get('top',{}).items(): spec[k]=v
    for k,v in extra.get('hook',{}).items(): spec['hook'][k]=v
    for i,s in extra.get('scenes',{}).items(): spec['scenes'][int(i)].update(s)
except FileNotFoundError: pass
json.dump(spec,open('spec.json','w'),indent=1,ensure_ascii=False)
