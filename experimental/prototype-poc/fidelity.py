"""Quantitative native/VectorCraft PNG comparison; no substitute SVG generation."""
from pathlib import Path
import struct,zlib,json,zipfile,io
from control import Prototype
P=Path(__file__).resolve().parent;E=P.parents[2]/'.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence'
def png(path):
 b=path.read_bytes();off=8;packed=b''
 while off<len(b):
  n=struct.unpack('>I',b[off:off+4])[0];tag=b[off+4:off+8];data=b[off+8:off+8+n];off+=n+12
  if tag==b'IHDR':w,h,depth,kind,_,_,interlace=struct.unpack('>IIBBBBB',data);assert depth==8 and kind==6 and interlace==0
  if tag==b'IDAT':packed+=data
 raw=zlib.decompress(packed);rows=[];last=bytearray(w*4);off=0
 def paeth(a,b,c):
  p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
  return a if pa<=pb and pa<=pc else b if pb<=pc else c
 for y in range(h):
  f=raw[off];off+=1;row=bytearray(raw[off:off+w*4]);off+=w*4
  for i in range(len(row)):
   a=row[i-4] if i>=4 else 0;b=last[i];c=last[i-4] if i>=4 else 0
   delta=0 if f==0 else a if f==1 else b if f==2 else (a+b)//2 if f==3 else paeth(a,b,c)
   row[i]=(row[i]+delta)&255
  rows.append(row);last=row
 return w,h,b''.join(rows)
def write_png(path,w,h,pixels):
 def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
 raw=b''.join(b'\0'+pixels[y*w*4:(y+1)*w*4] for y in range(h))
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
def compare(name):
 w,h,a=png(E/(name+'-vectorcraft.png'));w2,h2,b=png(E/('html-native-fidelity-'+name+'.png'));assert (w,h)==(w2,h2)==(390,844)
 regions={'whole':(0,0,w,h),'gradientInterior':(200,120,280,145),'clippedImage':(20,520,140,640),'imageInterior':(50,560,105,600),'transform':(140,520,260,640),'shadowEffect':(270,520,370,630),'hiddenGroup':(20,730,140,790),'typographyProbes':(20,640,370,710),'heading':(20,185,370,240)}
 metrics={}
 for region,(x0,y0,x1,y1) in regions.items():
  diffs=[];changed=0;maxd=0
  for y in range(y0,y1):
   for x in range(x0,x1):
    i=(y*w+x)*4;d=[abs(a[i+c]-b[i+c]) for c in range(3)];diffs.extend(d);changed+=max(d)>=8;maxd=max(maxd,max(d))
  n=(x1-x0)*(y1-y0);metrics[region]={'meanAbsoluteRgbError':round(sum(diffs)/len(diffs),4),'pixelsWithChannelDeltaAtLeast8Pct':round(changed/n*100,4),'maximumChannelDelta':maxd,'rect':[x0,y0,x1,y1]}
 heat=bytearray()
 for i in range(0,len(a),4):
  d=min(255,max(abs(a[i+c]-b[i+c]) for c in range(3))*4);heat.extend([d,0,0,255])
 write_png(E/(name+'-difference-x4.png'),w,h,heat)
 return {'scene':name,'dimensions':[w,h],'metrics':metrics}
def run():
 with zipfile.ZipFile(E/'four-scenes.igproto') as z:files={n:z.read(n) for n in z.namelist()}
 results=[];p=Prototype()
 try:
  for name in ['login','dashboard','settings','profile-overlay']:
   g=json.loads(files['prototype.json']);g['entry']=name
   path=E/('fidelity-entry-'+name+'.igproto')
   with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
    for n,b in files.items():z.writestr(n,json.dumps(g).encode() if n=='prototype.json' else b)
   r=p.call('prototype.open',path=str(path));assert r['state']['scene']==name
   assert p.call('prototype.screenshot',path=str(E/('html-native-fidelity-'+name+'.png')))['saved'];results.append(compare(name))
 finally:p.close();(E/'fidelity-control-trace.json').write_text(json.dumps(p.trace,indent=2))
 (E/'fidelity-metrics.json').write_text(json.dumps(results,indent=2));print(json.dumps({r['scene']:r['metrics']['whole'] for r in results},indent=2))
if __name__=='__main__':run()
