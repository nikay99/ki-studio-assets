import json
from voices import OUT
img={l.split()[0]:l.split()[1] for l in open('images.txt')}
foc={'s1':'center','s2':'center','s3':'top','s4':'center','s5':'top','s6':'top','s7':'top','s8':'center'}
spec={
 "topic":"SpaceX Super Heavy Booster-Fang durch den Startturm (Mechazilla), Flight 5, 13.10.2024",
 "pillar":"A",
 "title":"A Tower Caught a Falling Rocket. First Try.",
 "description":"A 71-meter rocket booster fell back to its launch tower, and two giant steel arms caught it in mid-air. SpaceX Starship Flight 5, October 13, 2024.\n\n🔔 Follow for the next true story.\n#shorts #spacex #starship #rocket #truestory",
 "tags":"SpaceX Starship \"Super Heavy\" Mechazilla \"booster catch\" rocket space \"true story\" technology",
 "sources":["https://www.npr.org/2024/10/13/nx-s1-5151788/spacex-starship-booster-caught-first-launch",
  "https://www.scientificamerican.com/article/spacex-catches-a-falling-starship-a-first-in-spaceflight-history/",
  "https://theengineer.co.uk/content/news/spacex-super-heavy-rocket-caught-by-chopsticks-arms"],
 "voice_name":"Liam","mood":"wow",
 "hook":{"image":img['hook'],"image2":img['image2'],"voice":OUT['hook']['voice'],"timestamps":OUT['hook']['timestamps'],
   "narration":OUT['hook']['narration'],"turn_word":"And","line1":"TALLER THAN\n20 STORIES","line2":"A TOWER CAUGHT IT."},
 "scenes":[],
 "keywords":{"red":["falls","ocean","roar","insane"],"yellow":["2024","Starship","thirty-three","Seven","mid-air","first"]},
 "zap":{"word":"catch","text":"SNAP!"},
 "sound":{"opener":"op_slam","whooshes":["wh_sharp",None,"wh_reverse","wh_soft",None,"whoosh_2",None,"wh_sharp"],
   "whoosh_vols":[0.45,0,0.45,0.35,0,0.5,0,0.4],"impact":"im_metal","climax":"cl_snap","riser":"ri_reverse","timeskip":None},
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
