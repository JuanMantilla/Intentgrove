import pathlib,json,hashlib,os,datetime
out=pathlib.Path(__file__).parent
before=json.loads((out/'before-removal.json').read_text())
removed=json.loads((out/'removed.json').read_text())
removal=json.loads((out/'removal.json').read_text())
source=pathlib.Path(removal['recoverablePath']); dest=pathlib.Path('/Applications/Intentgrove.app')
assert source.parent==pathlib.Path.home()/'.Trash'
assert source.is_dir() and not source.is_symlink() and source.stat().st_uid==os.getuid()
assert not dest.exists() and removed['manifests']['app'] is None
assert removed['processes']['exit']==1
for key in ['appSupport','preferences','fixtures','sharedDocuments','backup']:
 assert before['manifests'][key]==removed['manifests'][key],key
assert before['preferences']==removed['preferences']
actual={str(f.relative_to(source)):{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in sorted(source.rglob('*')) if f.is_file() and not f.is_symlink()}
assert actual==before['manifests']['app']
record={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'same-filesystem os.rename of exact hash-verified bundle from native Trash result; no destination replacement','source':str(source),'destination':str(dest),'recoverableManifest':actual,'all13FilesMatch':True,'documentsSettingsProfileBackupUnchangedWhileAbsent':True,'noOwnedProcessesWhileAbsent':True,'oldProfileRestored':False}
os.rename(source,dest)
assert dest.is_dir() and not source.exists()
record['restoredInodeMatches']=dest.stat().st_ino==before['stat']['inode']
(out/'restoration.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:v for k,v in record.items() if k!='recoverableManifest'}))
