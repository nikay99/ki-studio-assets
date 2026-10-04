import json, os
from voices import OUT
if os.path.exists('voices_norm.json'):
    for _k,_u in json.load(open('voices_norm.json')).items():
        if _k in OUT: OUT[_k]['voice']=_u
# Anzeige-Fix: "five-hundred-foot" ist als ein Untertitel-Wort zu breit -> Bindestriche als Leerzeichen
for _seg in OUT['s1']['timestamps']:
    _c=''.join(_seg['characters']); _i=_c.find('five-hundred-foot')
    if _i>=0:
        for _j in (_i+4,_i+12): _seg['characters'][_j]=' '
OUT['s1']['narration']=OUT['s1']['narration'].replace('five-hundred-foot','five hundred foot')
img={l.split()[0]:l.split()[1] for l in open('images.txt')}
foc={"s1":"center","s2":"center","s3":"center","s4":"center","s5":"center","s6":"center","s7":"center","s8":"center"}
spec={
 "topic":"NASA DART: Raumsonde (~$300M+) rammt am 26.09.2022 mit ~14.000 mph den Asteroidenmond Dimorphos (~500 ft), ~7 Mio. Meilen von der Erde, nach ~10 Monaten Flug; Ziel war 73 s Bahnverkuerzung, Ergebnis 32 Minuten; erster Versuch der Menschheit, einen Himmelskoerper zu verschieben",
 "pillar":"A",
 "title":"NASA Asteroid Test: They Smashed a Spacecraft Into It on Purpose",
 "cta":"WOULD YOU TRUST THIS PLAN?",
 "description":"NASA asteroid test DART smashed a spacecraft into the asteroid moon Dimorphos on purpose in September 2022. The target was about 500 feet wide, roughly 7 million miles from Earth, and the spacecraft hit it at around 14,000 mph. Scientists hoped to shorten its orbit by 73 seconds. It changed by 32 minutes, the first time humans ever moved a celestial body.\n\nWould you trust this plan? 🔔 Follow for the next true story.\nAI-generated recreation.\n#shorts #nasa #space #science #truestory",
 "tags":"nasa asteroid DART Dimorphos planetary defense spacecraft asteroid impact space science truestory",
 "sources":["https://science.nasa.gov/mission/dart/",
  "https://www.nasa.gov/news-release/nasa-confirms-dart-mission-impact-changed-asteroids-motion-in-space/",
  "https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test"],
 "voice_name":"Eric","mood":"epic",
 "hook":{"image":img['hook'],"image2":img['image2'],"voice":OUT['hook']['voice'],"timestamps":OUT['hook']['timestamps'],
   "narration":OUT['hook']['narration'],"turn_word":"On","line1":"SMASH IT INTO\nAN ASTEROID","line2":"ON PURPOSE."},
 "scenes":[],
 "keywords":{"red":["smash","no","direct","thirty-two","city"],"yellow":["three","five","hundred","ten","seven","fourteen","seventy-three","first"]},
 "sound":{"opener":"op_slam","whooshes":["wh_deep","wh_wind","whoosh_3","wh_paper"],"impact":"impact_box","climax":None,"riser":None,"timeskip":None},
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
