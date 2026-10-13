/** Neutral granted-document descriptors. Paths are display data, never authority. */
export type LocalTarget = { fileId: string; rootId?: never; segments?: never } | { rootId: string; segments: string[]; fileId?: never };
export interface PrototypeMetadata {
  title: string | null; entryScene: string; viewport: {width:number;height:number};
  formatVersion: number; sceneCount: number; readOnly: true; restoreToEntry: true;
}
export interface LocalView {
  fileId: string; identityKey: string; diskVersion: string; name: string; displayPath: string;
  kind: 'markdown' | 'image' | 'html' | 'prototype' | 'details'; viewToken: string | null;
  generation: number; bytes: number; extension: string; prototype?: PrototypeMetadata;
}
export type PrototypeDocument = LocalView & {kind:'prototype';viewToken:string;prototype:PrototypeMetadata};
