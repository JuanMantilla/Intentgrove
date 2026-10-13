use super::*;
use std::{path::{Path, PathBuf}, time::Duration};
const FIXTURE: &[u8] = include_bytes!("../../../tests/fixtures/prototype/phase-2/representative-v1.igproto");
fn control() -> Control { Control::new(Duration::from_secs(5)) }
struct Fixture(PathBuf);
impl Fixture { fn new() -> Self { let p=std::env::temp_dir().join(format!("igproto-document-{}",uuid::Uuid::new_v4()));std::fs::create_dir(&p).unwrap();Self(p) } fn file(&self,name:&str,bytes:&[u8])->PathBuf { let p=self.0.join(name); std::fs::write(&p,bytes).unwrap();p } }
impl Drop for Fixture { fn drop(&mut self) { std::fs::remove_dir_all(&self.0).unwrap(); } }
fn open_file(state: &AppState, path: &Path) -> AppResult<LocalView> {
    let grant=state.register_explicit_file(path)?;
    crate::document_view::open_impl(state,&crate::html::HtmlService::default(),crate::document_view::LocalTarget{file_id:Some(grant.id),root_id:None,segments:None},None,&control())
}
#[test] fn production_fixture_open_metadata_and_readonly() {
    use sha2::{Digest,Sha256};assert_eq!(format!("{:x}",Sha256::digest(FIXTURE)),"babda9a68bbb28a7473a72830c7db832773de3f6aa2ad0073639ddac25ab0032");
    let f=Fixture::new();let s=AppState::default();let v=open_file(&s,&f.file("a.igproto",FIXTURE)).unwrap();
    assert_eq!(v.kind,"prototype");let m=v.prototype.as_ref().unwrap();assert!(m.read_only&&m.restore_to_entry);assert_eq!(m.scene_count,4);assert_eq!(m.format_version,1);
    assert_eq!(s.prototypes.package(&s,v.view_token.as_ref().unwrap(),1).unwrap().sha256(),v.disk_version);
}
#[test] fn names_never_sniff_zip_or_markdown() {
    assert_eq!(crate::document_view::kind("A.IGPROTO"),"prototype");assert_eq!(crate::document_view::kind("a.zip"),"details");assert_eq!(crate::document_view::kind("a.igproto.md"),"markdown");assert_eq!(crate::document_view::kind("a.htm"),"html");assert_eq!(crate::document_view::kind("a.png"),"image");
    let f=Fixture::new();let s=AppState::default();let v=open_file(&s,&f.file("a.zip",FIXTURE)).unwrap();assert!(v.view_token.is_none());assert!(s.prototypes.documents.lock().unwrap().is_empty());
}
#[test] fn invalid_and_malicious_open_never_create_document() {
    let f=Fixture::new();let s=AppState::default();assert_eq!(open_file(&s,&f.file("bad.igproto",b"corrupt")).err().unwrap().code,"prototype_invalid");
    let attacks=Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/prototype/phase-2/malicious");
    // Preserved Phase 2 corpus exercises production app dispatch rather than a second validator.
    let mut count=0;
    for entry in std::fs::read_dir(attacks).unwrap() {let path=entry.unwrap().path();if path.extension().is_some_and(|x|x=="igproto") {let error=open_file(&s,&path).err().unwrap();assert!(error.package_diagnostics.is_some());count+=1;}}
    assert!(count>=3);assert!(s.prototypes.documents.lock().unwrap().is_empty());
}
#[test] fn unavailable_and_ungranted_sources_fail() {
    let f=Fixture::new();let s=AppState::default();assert_eq!(open_file(&s,&f.0.join("missing.igproto")).err().unwrap().code,"missing");
    assert_eq!(crate::document_view::open_impl(&s,&crate::html::HtmlService::default(),crate::document_view::LocalTarget{file_id:Some("ungranted".into()),root_id:None,segments:None},None,&control()).err().unwrap().code,"invalid_grant");
    let p=f.file("gone.igproto",FIXTURE);let grant=s.register_explicit_file(&p).unwrap();std::fs::remove_file(p).unwrap();let e=open(&s,s.file(&grant.id).unwrap(),None,&control()).err().unwrap();assert_eq!(e.code,"missing");
}
#[test] fn duplicate_native_identity_and_identical_copies() {
    let f=Fixture::new();let s=AppState::default();let p=f.file("a.igproto",FIXTURE);let a=open_file(&s,&p).unwrap();let same=open_file(&s,&p).unwrap();assert_eq!(a.view_token,same.view_token);
    let b=open_file(&s,&f.file("b.igproto",FIXTURE)).unwrap();assert_ne!(a.identity_key,b.identity_key);assert_ne!(a.view_token,b.view_token);assert_eq!(a.disk_version,b.disk_version);
}
#[test] fn close_reopen_isolated_and_releases_snapshot_and_grant() {
    let f=Fixture::new();let s=AppState::default();let p=f.file("a.igproto",FIXTURE);let a=open_file(&s,&p).unwrap();let b=open_file(&s,&f.file("b.igproto",FIXTURE)).unwrap();
    let package=s.prototypes.package(&s,a.view_token.as_ref().unwrap(),1).unwrap();let weak=Arc::downgrade(&package);drop(package);
    assert!(dispose(&s,a.view_token.as_ref().unwrap(),1,true).unwrap());assert!(weak.upgrade().is_none());assert!(s.file(&a.file_id).is_err());assert!(!dispose(&s,a.view_token.as_ref().unwrap(),1,true).unwrap());
    assert!(status(&s,b.view_token.as_ref().unwrap(),1).is_ok());let reopened=open_file(&s,&p).unwrap();assert_ne!(a.view_token,reopened.view_token);
}
#[test] fn explicit_reload_atomic_failure_retains_old_and_isolated() {
    let f=Fixture::new();let s=AppState::default();let p=f.file("a.igproto",FIXTURE);let a=open_file(&s,&p).unwrap();let b=open_file(&s,&f.file("b.igproto",FIXTURE)).unwrap();let token=a.view_token.as_ref().unwrap();
    std::fs::write(&p,b"corrupt replacement").unwrap();assert!(status(&s,token,1).unwrap().changed);
    let failed=reload(&s,token,1,1,&control()).unwrap();assert!(failed.reload_error.is_some());assert_eq!(failed.view.disk_version,a.disk_version);assert_eq!(failed.view.generation,1);
    let minimal=include_bytes!("../../../tests/fixtures/prototype/phase-2/minimal-v1.igproto");std::fs::write(&p,minimal).unwrap();let next=reload(&s,token,1,2,&control()).unwrap();assert!(next.reload_error.is_none());assert_ne!(next.view.disk_version,a.disk_version);assert_eq!(next.view.generation,2);assert_eq!(next.view.prototype.unwrap().scene_count,1);
    assert_eq!(status(&s,b.view_token.as_ref().unwrap(),1).unwrap().view.disk_version,b.disk_version);assert!(status(&s,token,1).is_err());
}
#[test] fn identity_substitution_revokes_snapshot() {
    let f=Fixture::new();let s=AppState::default();let p=f.file("a.igproto",FIXTURE);let a=open_file(&s,&p).unwrap();let replacement=f.file("replacement",FIXTURE);std::fs::rename(replacement,p).unwrap();
    assert_eq!(reload(&s,a.view_token.as_ref().unwrap(),1,1,&control()).err().unwrap().code,"reselection_required");assert!(s.prototypes.documents.lock().unwrap().is_empty());
}
#[test] fn grant_revocation_and_session_limit_cancel() {
    let f=Fixture::new();let s=AppState::default();let mut first=None;
    for i in 0..4 {let v=open_file(&s,&f.file(&format!("{i}.igproto"),FIXTURE)).unwrap();first.get_or_insert(v);}
    assert_eq!(open_file(&s,&f.file("fifth.igproto",FIXTURE)).err().unwrap().code,"prototype_limit");
    s.register_root(&f.0).unwrap();assert!(s.prototypes.documents.lock().unwrap().is_empty());
    let cancelled=control();cancelled.cancel();let grant=s.register_explicit_file(&f.0.join("0.igproto")).unwrap();assert!(open(&s,s.file(&grant.id).unwrap(),None,&cancelled).is_err());assert!(s.prototypes.documents.lock().unwrap().is_empty());
}

#[test] fn unsupported_version_integrity_and_limit_diagnostics() {
    let f=Fixture::new();let s=AppState::default();
    let mut members=igproto_package::archive::read(FIXTURE).unwrap();
    let mut manifest:serde_json::Value=serde_json::from_slice(&members["manifest.json"]).unwrap();
    manifest["version"]=serde_json::json!(2);members.insert("manifest.json".into(),serde_json::to_vec(&manifest).unwrap());
    let future=igproto_package::writer::write(&members).unwrap();let e=open_file(&s,&f.file("future.igproto",&future)).err().unwrap();assert_eq!(e.code,"prototype_version_unsupported");assert!(e.package_diagnostics.unwrap().diagnostics.iter().any(|d|d.code==igproto_model::Code::UnsupportedVersion));
    let mut members=igproto_package::archive::read(FIXTURE).unwrap();members.get_mut("prototype.json").unwrap().push(b' ');
    let corrupt=igproto_package::writer::write(&members).unwrap();assert_eq!(open_file(&s,&f.file("integrity.igproto",&corrupt)).err().unwrap().code,"prototype_integrity");
    let p=f.file("oversize.igproto",b"");std::fs::OpenOptions::new().write(true).open(&p).unwrap().set_len(igproto_package::limits::ARCHIVE as u64+1).unwrap();assert_eq!(open_file(&s,&p).err().unwrap().code,"prototype_limit");assert!(s.prototypes.documents.lock().unwrap().is_empty());
}
#[test] fn native_denied_read_and_symlink_substitution() {
    use std::os::unix::fs::{PermissionsExt,symlink};
    let f=Fixture::new();let s=AppState::default();let p=f.file("denied.igproto",FIXTURE);let grant=s.register_explicit_file(&p).unwrap();
    std::fs::set_permissions(&p,std::fs::Permissions::from_mode(0)).unwrap();let result=open(&s,s.file(&grant.id).unwrap(),None,&control());std::fs::set_permissions(&p,std::fs::Permissions::from_mode(0o600)).unwrap();assert_eq!(result.err().unwrap().code,"denied");
    std::fs::remove_file(&p).unwrap();let other=f.file("other",FIXTURE);symlink(&other,&p).unwrap();assert_eq!(open(&s,s.file(&grant.id).unwrap(),None,&control()).err().unwrap().code,"unsupported_type");assert!(s.prototypes.documents.lock().unwrap().is_empty());
}
#[test] fn refreshed_package_never_automatically_replaces_snapshot_and_markdown_coexists() {
    let f=Fixture::new();let s=AppState::default();let p=f.file("a.igproto",FIXTURE);let a=open_file(&s,&p).unwrap();let b=open_file(&s,&f.file("b.igproto",FIXTURE)).unwrap();
    let md=f.file("c.md",b"# unchanged Markdown\n");let c=open_file(&s,&md).unwrap();let text=crate::document::read_document_impl(&s,Some(&c.file_id),None,None).unwrap();assert_eq!(text.content,"# unchanged Markdown\n");
    std::fs::write(&p,include_bytes!("../../../tests/fixtures/prototype/phase-2/minimal-v1.igproto")).unwrap();let fingerprint=crate::prototype::fingerprint(&s,&a.file_id).unwrap();assert_ne!(fingerprint.0,a.disk_version);
    assert_eq!(s.prototypes.package(&s,a.view_token.as_ref().unwrap(),1).unwrap().sha256(),a.disk_version);assert_eq!(status(&s,b.view_token.as_ref().unwrap(),1).unwrap().view.disk_version,b.disk_version);
    assert!(crate::document::read_document_impl(&s,Some(&a.file_id),None,None).is_err());
}
