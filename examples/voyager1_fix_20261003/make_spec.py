import json
from voices import OUT
import os
if os.path.exists('voices_norm.json'):
    for _k,_u in json.load(open('voices_norm.json')).items():
        if _k in OUT: OUT[_k]['voice']=_u
img={l.split()[0]:l.split()[1] for l in open('images.txt')}
foc={"s1":"center","s2":"center","s3":"center","s4":"center","s5":"top","s6":"bottom","s7":"top","s8":"center"}
spec={
 "topic":"NASA repariert Voyager 1 per Funk aus 15 Mrd. Meilen (FDS-Speicherchip defekt, Nov 2023 bis Apr 2024)",
 "pillar":"B",
 "title":"It's 15 Billion Miles Away. NASA Fixed It Anyway.",
 "cta":"COULD YOU FIX IT?",
 "description":"Voyager 1 is 15 billion miles from Earth, and in 2023 it started sending gibberish. NASA engineers found a dead memory chip and fixed a 1977 computer with a radio message.\n\nCould you have fixed it? 🔔 Follow for the next true story.\n#shorts #nasa #voyager1 #space #truestory",
 "tags":"NASA Voyager1 Voyager space spacecraft engineering JPL truestory science",
 "sources":["https://www.jpl.nasa.gov/news/nasas-voyager-1-resumes-sending-engineering-updates-to-earth/",
  "https://www.jpl.nasa.gov/images/pia26275-voyager-team-celebrates-engineering-data-return",
  "https://www.theregister.com/2024/04/23/voyager_1_engineering_updates/"],
 "voice_name":"Liam","mood":"curious",
 "hook":{"image":img['hook'],"image2":img['image2'],"voice":OUT['hook']['voice'],"timestamps":OUT['hook']['timestamps'],
   "narration":OUT['hook']['narration'],"turn_word":"And","line1":"15 BILLION\nMILES AWAY","line2":"THEY FIXED IT."},
 "scenes":[],
 "keywords":{"red":["gibberish","died"],"yellow":["2023","1977,","2024.","rewrite","answers."]},
 "sound":{"opener":"punch","whooshes":["whoosh_1","wh_deep","wh_soft","wh_paper"],"impact":"im_stamp","climax":None,"riser":None,"timeskip":None},
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
