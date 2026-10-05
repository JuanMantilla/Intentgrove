from qa import *
def lum(c):
 v=[x/255 for x in c[:3]];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v];return sum(a*b for a,b in zip(v,[.2126,.7152,.0722]))
def rgb(s):return [int(s[i:i+2],16) for i in (0,2,4)]
def match(colors,h):
 t=rgb(h);found=[c for c in colors if max(abs(a-b) for a,b in zip(c['rgba'][:3],t))<=2];return min(found,key=lambda c:sum((a-b)**2 for a,b in zip(c['rgba'][:3],t))) if found else None
rows=[]
for state in ('empty','reader','error','editor','conflict'):
 for mode in ('light','dark'):
  src=f'{state}-640-es-{mode}.png';p=OUT/src
  palette=json.loads(run('/private/tmp/f002a-image-colors',str(p),'420','250','850','1350'))
  (OUT/(src+'.palette.json')).write_text(json.dumps(palette))
  fg='202826' if mode=='light' else 'E6EEEA';bg=('F4F5F3' if mode=='light' else '151B1B') if state in ('empty','error') else ('FFFFFF' if mode=='light' else '202928')
  for name,f,b in [('primary text',fg,bg),('secondary text','52615C' if mode=='light' else 'A8B9B1',bg)]:
   a=match(palette['colors'],f);c=match(palette['colors'],b);r={'state':state,'theme':mode,'pair':name,'source':src,'foreground':a,'background':c,'threshold':4.5}
   if a and c:
    lo,hi=sorted([lum(a['rgba']),lum(c['rgba'])]);r['ratio']=(hi+.05)/(lo+.05);r['result']='PASS' if r['ratio']>=4.5 else 'FAIL'
   else:r['result']='NOT TESTED'
   rows.append(r)
(OUT/'contrast-results.json').write_text(json.dumps({'method':'Solid screenshot colors in reader/status region; native helper converts embedded color profile to sRGB. Does not establish every surface or antialiased pixel contrast.','rows':rows},indent=2))
print(json.dumps({k:sum(r['result']==k for r in rows) for k in ['PASS','FAIL','NOT TESTED']}))
