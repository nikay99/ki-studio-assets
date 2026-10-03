import json
from voices import OUT
import os
if os.path.exists('voices_norm.json'):
    for _k,_u in json.load(open('voices_norm.json')).items():
        if _k in OUT: OUT[_k]['voice']=_u
img={l.split()[0]:l.split()[1] for l in open('images.txt')}
foc={"s1":"center","s2":"center","s3":"center","s4":"top","s5":"center","s6":"center","s7":"top","s8":"top"}
spec={
 "topic":"Citibank überweist im Aug 2020 versehentlich ~900 Mio. $ an Revlon-Gläubiger; Richter Furman (Feb 2021): dürfen behalten; 2nd Circuit kippt das im Sep 2022",
 "pillar":"C",
 "title":"A Bank Sent $900 Million by Mistake. A Judge Said Keep It.",
 "cta":"WOULD YOU GIVE IT BACK?",
 "description":"In August 2020, Citibank meant to send about $8 million in interest. One wrong checkbox later, it sent $900 million of its own money. Some lenders kept $500 million, and in 2021 a judge said they could. In 2022, an appeals court reversed the ruling.\n\nWould you have given it back? 🔔 Follow for the next true story.\n#shorts #money #banking #citibank #truestory",
 "tags":"Citibank Citi Revlon bank mistake money finance lawsuit court truestory",
 "sources":["https://www.torys.com/our-latest-thinking/publications/2022/09/second-circuit-reverses-citibank-revlon-decision",
  "https://news.bloomberglaw.com/banking-law/citigroups-900-million-revlon-error-ends-with-bank-victory",
  "https://www.business-standard.com/article/international/citibank-revlon-900-million-mistake"],
 "voice_name":"Jessica","mood":"curious",
 "hook":{"image":img['hook'],"image2":img['image2'],"voice":OUT['hook']['voice'],"timestamps":OUT['hook']['timestamps'],
   "narration":OUT['hook']['narration'],"turn_word":"And","line1":"$900 MILLION\nBY MISTAKE","line2":"JUDGE: KEEP IT."},
 "scenes":[],
 "keywords":{"red":["wrong","keep","flips"],"yellow":["2020","eight","nine","five","2021","2022","one","two"]},
 "sound":{"opener":"op_bass","whooshes":["whoosh_2","wh_sharp","whoosh_3","wh_wind"],"impact":"impact_box","climax":None,"riser":None,"timeskip":None},
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
