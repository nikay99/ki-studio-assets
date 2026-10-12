# python3 mkprops.py MG Madagascar Antananarivo Africa 1 props.json   (1 = Name ohne Vokale, 0 = normales Rätsel mit halben Buchstaben)
import json, os, sys
code, country, cap, cont, nv, out = sys.argv[1:7]
sh = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../public/shapes.json')))
s = sh['shapes'][code]
json.dump({'code': code, 'country': country, 'cap': cap, 'cont': cont, 'nv': nv == '1', 'd': s['d'], 'world': sh['world'], 'dotx': s['dot'][0], 'doty': s['dot'][1]}, open(out, 'w'))
