import pathlib,json,hashlib,subprocess,os,datetime,sys
repo=pathlib.Path(__file__).resolve().parents[4]; out=pathlib.Path(__file__).parent; home=pathlib.Path.home()
def manifest(p):
 if not p.exists(): return None
 files=[p] if p.is_file() else sorted(p.rglob('*'))
 return {str(f.relative_to(p) if f!=p else f.name): {'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in files if f.is_file() and not f.is_symlink()}
def cmd(args):
 r=subprocess.run(args,text=True,capture_output=True); return {'exit':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
app=pathlib.Path('/Applications/Intentgrove.app'); backup=home/'Intentgrove Backups/before-fresh-acceptance-20261008-093538'
paths={'app':app,'backup':backup,'appSupport':home/'Library/Application Support/com.juanmantilla.markdownworkspace','preferences':home/'Library/Preferences/com.juanmantilla.markdownworkspace.plist','fixtures':repo/'qa/runs/macos-remaining-20261008/native-final-20261008/fixtures','sharedDocuments':pathlib.Path('/Users/Shared/Intentgrove-Acceptance-20261008/Test Documents')}
r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'uid':os.getuid(),'paths':{k:str(v) for k,v in paths.items()},'manifests':{k:manifest(v) for k,v in paths.items()},'processes':cmd(['pgrep','-alf','md_reader|DiagramRenderer|ImageDecoder']),'preferences':cmd(['defaults','export','com.juanmantilla.markdownworkspace','-']),'os':cmd(['sw_vers']),'arch':cmd(['uname','-m'])}
if app.exists():
 r['owner']=app.stat().st_uid; r['stat']={'inode':app.stat().st_ino,'device':app.stat().st_dev}; r['plist']=cmd(['plutil','-p',str(app/'Contents/Info.plist')]); r['signature']=cmd(['codesign','--verify','--deep','--strict',str(app)]); r['signingIdentity']=cmd(['codesign','-dvv',str(app)]);r['file']=cmd(['file',str(app/'Contents/MacOS/md_reader')])
(out/(sys.argv[1]+'.json')).write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({'snapshot':sys.argv[1],'appExists':app.exists(),'main':(r['manifests']['app'] or {}).get('Contents/MacOS/md_reader'),'processes':r['processes'],'counts':{k:len(v) if v is not None else None for k,v in r['manifests'].items()}}))
