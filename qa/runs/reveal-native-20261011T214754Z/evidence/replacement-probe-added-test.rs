
#[cfg(test)]
mod qa_replacement_probe {
 use super::*;
 #[test]
 fn qa_unopened_listing_replacement_must_be_rejected() {
  let dir=std::env::temp_dir().join(format!("qa-reveal-replacement-{}",uuid::Uuid::new_v4()));
  std::fs::create_dir(&dir).unwrap();
  let path=dir.join("listed.md"); std::fs::write(&path,"original").unwrap();
  let state=AppState::default(); let root=state.register_root(&dir).unwrap();
  let listed=crate::listing::list_entries_impl(&state,&root.id,vec![],0,"qa-list",None).unwrap();
  assert_eq!(listed.entries[0].name,"listed.md");
  let before=identity(&open_selected(&path,false).unwrap()).unwrap();
  std::fs::rename(&path,dir.join("original.md")).unwrap();
  std::fs::write(&path,"replacement").unwrap();
  let after=identity(&open_selected(&path,false).unwrap()).unwrap();
  assert_ne!(before,after);
  let result=resolve_path(&state,&RevealTarget::RootFile{root_id:root.id,segments:vec!["listed.md".into()]});
  println!("original_identity={:?} replacement_identity={:?} resolver_result={:?}",before,after,result);
  std::fs::remove_dir_all(&dir).unwrap();
  assert!(result.is_err(),"Unopened listed item replacement accepted by production resolver");
 }
}
