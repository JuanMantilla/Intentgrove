import { invoke } from '@tauri-apps/api/core';
import type {LocalTarget,LocalView} from './documentView';
export type {LocalTarget,LocalView} from './documentView';
export interface HtmlLocation { headingId: string | null; offset: number; scrollTop: number; scrollLeft: number; zoom: number }
export interface HtmlHeading { key: string; authoredId: string | null; level: number; text: string }
export interface HtmlIssue { id: string; declaredUrl: string; kind: string; reason: string }
export interface HtmlState {
  viewToken: string; generation: number; revision: number; requestId: number;
  state: 'opening' | 'ready' | 'empty' | 'failed'; reasonCode: string | null;
  issues: HtmlIssue[]; headings: HtmlHeading[]; location: HtmlLocation;
}
export interface HtmlBaseline { font: 'roboto' | 'serif' | 'sans' | 'mono'; size: number; lineHeight: number }
export interface HtmlBounds { x: number; y: number; width: number; height: number }
export interface HtmlOwner { viewToken: string; generation: number }
export interface HtmlRequest extends HtmlOwner { requestId: number }
export interface HtmlLink { kind: 'anchor' | 'html' | 'prototype' | 'document' | 'image' | 'details' | 'blocked' | 'unsupported' | 'missing' | 'access_required'; requestedPath: string | null; accessId: string | null; fileId: string | null; anchor: string | null; reason: string | null }
export interface HtmlSnapshot { headings?: HtmlHeading[]; location: HtmlLocation; empty?: boolean; requestId?: number }
/** Native provider contract. UI integration is deliberately left to the frontend owner. */
export const htmlNative = {
  open: (target: LocalTarget, requestId: string, expectedIdentity?: string) => invoke<LocalView>('open_local_view', { target, requestId, expectedIdentity }),
  cancelOpen: (requestId: string) => invoke<boolean>('cancel_html_open', { requestId }),
  mount: (owner: HtmlRequest, bounds: HtmlBounds, visible: boolean, baseline?: HtmlBaseline) => invoke<HtmlState>('mount_html_view', { ...owner, bounds, visible, baseline }),
  viewport: (owner: HtmlRequest, bounds: HtmlBounds, visible: boolean) => invoke<void>('update_html_viewport', { ...owner, bounds, visible }),
  state: (owner: HtmlOwner) => invoke<HtmlState>('get_html_state', owner as unknown as Record<string, unknown>),
  capture: (owner: HtmlRequest) => invoke<HtmlSnapshot>('capture_html_location', owner as unknown as Record<string, unknown>),
  location: (owner: HtmlRequest, location: HtmlLocation) => invoke<HtmlSnapshot>('set_html_location', { ...owner, location }),
  find: (owner: HtmlRequest, query: string, backwards = false) => invoke<HtmlSnapshot & { count: number; current: number }>('find_html_text', { ...owner, query, backwards }),
  focus: (owner: HtmlRequest) => invoke<void>('focus_html_view', owner as unknown as Record<string, unknown>),
  reload: (owner: HtmlRequest) => invoke<LocalView>('reload_html_view', owner as unknown as Record<string, unknown>),
  resource: (owner: HtmlOwner, issueId: string) => invoke<HtmlState | null>('choose_html_resource', { ...owner, issueId }),
  resourceFolder: (owner: HtmlOwner) => invoke<HtmlState | null>('choose_html_resource_folder', owner as unknown as Record<string, unknown>),
  link: (owner: HtmlOwner, navigationId: string) => invoke<HtmlLink>('resolve_local_view_link', { ...owner, navigationId }),
  chooseLink: (owner: HtmlOwner, accessId: string) => invoke<{ view: LocalView; anchor: string | null } | null>('choose_html_link_file', { ...owner, accessId }),
  dispose: (owner: HtmlOwner) => invoke<boolean>('dispose_html_view', owner as unknown as Record<string, unknown>),
  searchHit: (jobId: string, hitId: string) => invoke<LocalView>('open_local_search_hit', { jobId, hitId }),
};
