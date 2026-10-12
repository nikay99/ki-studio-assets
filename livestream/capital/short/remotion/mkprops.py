import json,sys
code,country,cap,trap=sys.argv[1:5]
sh=json.load(open('/tmp/claude-0/-home-user/8efc91e7-e51b-51eb-8a78-6f7263735df1/scratchpad/repo/livestream/capital/public/shapes.json'))['shapes'][code]
json.dump({'code':code,'country':country,'cap':cap,'trap':trap,'d':sh['d'],'capx':sh['cap'][0],'capy':sh['cap'][1]},open(sys.argv[5],'w'))
