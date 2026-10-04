import json, os
from voices import OUT
if os.path.exists('voices_norm.json'):
    for _k,_u in json.load(open('voices_norm.json')).items():
        if _k in OUT: OUT[_k]['voice']=_u
img={l.split()[0]:l.split()[1] for l in open('images.txt')}
foc={"s1":"center","s2":"center","s3":"center","s4":"center","s5":"center","s6":"center","s7":"center","s8":"center"}
spec={
 "topic":"Noland Arbaugh, seit 2016 ab den Schultern gelaehmt, bekommt im Jan 2024 als erster Mensch ein Neuralink-Implantat (64 Faeden, OP-Roboter, Barrow Phoenix); steuert Cursor per Gedanken, spielt Schach im Livestream (Maerz 2024) und Civilization bis 6 Uhr morgens; ~85 % der Faeden zogen sich zurueck, Software-Update stellte Kontrolle wieder her und verbesserte sie",
 "pillar":"A",
 "title":"Neuralink's First Patient Plays Chess With His Mind",
 "cta":"WOULD YOU GET THE CHIP?",
 "description":"Neuralink's first human patient, Noland Arbaugh, is paralyzed from the shoulders down. In January 2024 a surgical robot placed a brain chip with 64 ultra-thin threads in his brain. Weeks later he moved a cursor just by thinking, played chess online and gamed until 6 a.m. When most of the threads slipped out, engineers fixed it with a software update and his control came back even better.\n\nWould you get the chip? 🔔 Follow for the next true story.\nAI-generated recreation.\n#shorts #neuralink #technology #science #truestory",
 "tags":"neuralink Noland Arbaugh brain chip brain computer interface Elon Musk chess paralyzed technology science truestory",
 "sources":["https://en.wikipedia.org/wiki/Noland_Arbaugh",
  "https://neuralink.com/blog/prime-study-progress-update-user-experience/",
  "https://www.lbc.co.uk/tech/neuralink-first-patient-noland-arbaugh/"],
 "voice_name":"Chris","mood":"wonder",
 "hook":{"image":img['hook'],"image2":img['image2'],"voice":OUT['hook']['voice'],"timestamps":OUT['hook']['timestamps'],
   "narration":OUT['hook']['narration'],"turn_word":"Yet","line1":"CAN'T MOVE\nA FINGER","line2":"MIND CONTROL."},
 "scenes":[],
 "keywords":{"red":["can't","slipping","still","brain"],"yellow":["first","sixty-four","six","thinking","better"]},
 "sound":{"opener":"punch","whooshes":["wh_soft","wh_sharp","wh_reverse","whoosh_1"],"impact":"im_metal","climax":None,"riser":None,"timeskip":None},
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
