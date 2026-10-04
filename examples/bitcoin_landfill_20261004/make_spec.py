import json, os
from voices import OUT
if os.path.exists('voices_norm.json'):
    for _k,_u in json.load(open('voices_norm.json')).items():
        if _k in OUT: OUT[_k]['voice']=_u
img={l.split()[0]:l.split()[1] for l in open('images.txt')}
foc={"s1":"center","s2":"center","s3":"center","s4":"center","s5":"center","s6":"center","s7":"center","s8":"bottom"}
spec={
 "topic":"James Howells (Newport, Wales) wirft 2013 eine Festplatte mit 8.000 BTC weg; Stadt verweigert Grabung; Klage über £495 Mio. im Jan 2025 abgewiesen; Kaufangebot 2025, Deponie wird geschlossen; Aug 2025 gibt er die Suche auf",
 "pillar":"C",
 "title":"A Hard Drive Worth $500 Million Is Buried in a Dump",
 "cta":"WOULD YOU KEEP DIGGING?",
 "description":"In 2013, James Howells threw out an old hard drive in Newport, Wales. It held 8,000 bitcoin, worth about half a billion dollars today and nearly a billion at bitcoin's peak. The city refused to let him dig, a court threw out his lawsuit, and the landfill is being closed. In 2025 he finally gave up the search.\n\nWould you keep digging? 🔔 Follow for the next true story.\n#shorts #bitcoin #crypto #money #truestory",
 "tags":"James Howells bitcoin hard drive landfill Newport crypto money lost fortune truestory",
 "sources":["https://en.wikipedia.org/wiki/Bitcoin_buried_in_Newport_landfill",
  "https://dailygalaxy.com/2026/08/james-howells-bitcoin-hard-drive-landfill-search-ends/",
  "https://fortune.com/2025/02/11/bitcoin-trash-landfill-purchase-james-howells-newport"],
 "voice_name":"Liam","mood":"tense",
 "hook":{"image":img['hook'],"image2":img['image2'],"voice":OUT['hook']['voice'],"timestamps":OUT['hook']['timestamps'],
   "narration":OUT['hook']['narration'],"turn_word":"It","line1":"$500 MILLION\nIN THE TRASH","line2":"STILL BURIED."},
 "scenes":[],
 "keywords":{"red":["trash","mistake","no","out","still"],"yellow":["2013","half","billion","eight","quarter","six","twelve"]},
 "sound":{"opener":"op_bass","whooshes":["wh_sharp","whoosh_2","wh_paper","whoosh_3"],"impact":"im_stamp","climax":None,"riser":None,"timeskip":None},
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
