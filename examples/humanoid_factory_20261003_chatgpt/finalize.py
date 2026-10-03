# Claude (Story-Shorts-Thread) 03.10.: ChatGPT-Checkpoint fertigstellen -> spec_final.json
import json
s=json.load(open('spec.json'))
norm=["https://v3b.fal.media/files/b/0aaceaed/KSO3BFkuf0JvXtKaPvBT5_normalized_audio.wav",
"https://v3b.fal.media/files/b/0aaceaed/b0Zm1BR8uRVB9lXoNOUfX_normalized_audio.wav",
"https://v3b.fal.media/files/b/0aaceaed/JJYw76yhC3jU7z1e3oWIg_normalized_audio.wav",
"https://v3b.fal.media/files/b/0aaceaee/zm1LAdGz3CtJ5bEFF5a13_normalized_audio.wav",
"https://v3b.fal.media/files/b/0aaceaef/BLTHZUFQH7nVdUkdCQblc_normalized_audio.wav",
"https://v3b.fal.media/files/b/0aaceaef/pCqeO3e0YG4E5K7UpJqcI_normalized_audio.wav",
"https://v3b.fal.media/files/b/0aaceaef/a2eFp8mToKGDl_Zn-yot8_normalized_audio.wav",
"https://v3b.fal.media/files/b/0aaceaef/Z1B24BFUQxHyZNISlpqhT_normalized_audio.wav"]
s['hook']['voice']=norm[0]
for sc,u in zip(s['scenes'],norm[1:]): sc['voice']=u
s['hook']['line2']="NOW THE UPGRADE."
s['pillar']="A"; s['voice_name']="Jessica"; s['mood']="curious"
s['cta']="WOULD YOU WORK NEXT TO ONE?"
s['description']="A humanoid robot spent ten months on a real BMW production line in South Carolina and helped build 30,000 cars. Now its successor, Figure 03, is back at BMW for harder work.\n\nWould you work next to one? 🔔 Follow for the next true story.\n#shorts #robotics #ai #bmw #truestory"
s['sound']['opener']="op_slam"; s['sound']['impact']="im_metal"
s['music_vol']=0.35
for sc in s['scenes']:
    if sc.get('sfx'): sc['sfx_vol']=min(sc.get('sfx_vol',1),0.45)
json.dump(s,open('spec_final.json','w'),indent=1,ensure_ascii=False)
