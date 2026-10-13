import pathlib,json,subprocess,hashlib,datetime
root=pathlib.Path(__file__).resolve().parents[3];run=pathlib.Path(__file__).resolve().parent
metadata=json.loads(subprocess.check_output(['cargo','metadata','--manifest-path',str(root/'src-tauri/Cargo.toml'),'--offline','--locked','--format-version','1','--no-default-features','--filter-platform','aarch64-apple-darwin'],text=True))
packages={p['id']:p for p in metadata['packages']};nodes={n['id']:n for n in metadata['resolve']['nodes']};pending=[metadata['resolve']['root']];seen=set()
while pending:
 p=pending.pop()
 if p in seen:continue
 seen.add(p);pending.extend(d['pkg'] for d in nodes[p]['deps'])
names={packages[p]['name'] for p in seen}
assert {'igproto-model','igproto-package'}<=names
assert not names & {'igproto-compiler','igproto-cli','igproto-mcp'}
assert not any('vectorcraft' in n.lower() for n in names)
for p in (root/'src-tauri/src/prototype').glob('*.rs'):
 if p.name=='tests.rs':continue
 text=p.read_text()
 for forbidden in ['ZipArchive','serde_json::from','WKWebView','file://','extract(','WebviewBuilder','eval(']:assert forbidden not in text,(p,forbidden)
loader=(root/'src-tauri/src/prototype/loader.rs').read_text();assert 'igproto_package::validate_with_control' in loader and 'limits::ARCHIVE' in loader
lib=(root/'src-tauri/src/lib.rs').read_text();assert '#[cfg(feature = "document-contract-tests")]' in lib
app=next(p for p in metadata['packages'] if p['name']=='md_reader');assert 'document-contract-tests' not in app['features']['default']
fixture=root/'tests/fixtures/prototype/phase-2/representative-v1.igproto';digest=hashlib.sha256(fixture.read_bytes()).hexdigest();assert digest=='babda9a68bbb28a7473a72830c7db832773de3f6aa2ad0073639ddac25ab0032'
before=json.loads((run/'pre-existing-files.json').read_text());protected=['src/styles/app.css','src-tauri/src/html_surface.m','src-tauri/src/document.rs']
for p in protected:assert hashlib.sha256((root/p).read_bytes()).hexdigest()==before[p]['sha256'],p
report={'result':'PASS','default_application_igproto_dependencies':sorted(n for n in names if n.startswith('igproto-')),'prototype_native_modules_no_parser_or_player':True,'native_bounded_independent_validation':True,'test_facade_excluded_by_default':True,'canonical_fixture_sha256':digest,'protected_files_unchanged':[str(root/p) for p in protected],'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(run/'boundaries-final.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
