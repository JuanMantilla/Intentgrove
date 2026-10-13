#!/usr/bin/env python3
"""Rebuild small purpose-specific production attack fixtures; never extracts files."""
import hashlib,io,json,pathlib,zipfile,warnings
root=pathlib.Path(__file__).resolve().parent
malicious=root/'malicious';malicious.mkdir(exist_ok=True)
with zipfile.ZipFile(root/'representative-v1.igproto') as z:
    valid={n:z.read(n) for n in z.namelist()}
def archive(entries):
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as z:
        for name,data in entries:
            info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            with warnings.catch_warnings():
                warnings.simplefilter('ignore',UserWarning);z.writestr(info,data)
    return out.getvalue()
def seal(files):
    manifest=json.loads(files['manifest.json']);old={f['path']:f['mediaType'] for f in manifest['files']}
    manifest['files']=[{'path':p,'mediaType':old.get(p,'image/svg+xml'),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for p,b in sorted(files.items()) if p!='manifest.json']
    files['manifest.json']=json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()
    return archive(sorted(files.items()))
for name,entries in {'zip-traversal':[('../manifest.json',b'{}')],'zip-absolute':[('/manifest.json',b'{}')],'zip-duplicate':[('manifest.json',b'{}'),('manifest.json',b'{}')],'zip-unicode':[('scenes/homé.svg',b'')],'zip-encoded-path':[('scenes/%2e%2e.svg',b'')],'zip-executable':[('player.js',b'alert(1)')]}.items():
    (malicious/(name+'.igproto')).write_bytes(archive(entries))
(malicious/'zip-malformed.igproto').write_bytes(b'not a ZIP')
svg_prefix='<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">'
for name,body in {'svg-script':'<script>alert(1)</script>','svg-event':'<rect onclick="alert(1)"/>','svg-foreign-object':'<foreignObject/>','target-missing':'<g data-prototype-id="root"/>','target-duplicate':'<g data-prototype-id="root"><rect data-prototype-id="back-button"/><rect data-prototype-id="back-button"/></g>','target-malformed':'<g data-prototype-id="Bad Target"/>','svg-network':'<image href="https://example.invalid/avatar.png"/>'}.items():
    svg=(svg_prefix+body+'</svg>').encode();(malicious/(name+'.svg')).write_bytes(svg)
    files=valid.copy();files['scenes/settings.svg']=svg;(malicious/(name+'.igproto')).write_bytes(seal(files))
print(json.dumps({'fixtures':len(list(malicious.iterdir())),'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(malicious.iterdir())}},indent=2))
