#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#include <stdint.h>
#include "html_inspect.inc"

typedef struct { unsigned char *data; size_t len; char *mime; } IGBytes;
extern IGBytes ig_html_resource(const char *,const char *);
extern void ig_html_release(IGBytes);
extern void ig_html_event(const char *,uint64_t,const char *);
#if IG_HTML_PROBE
extern uint64_t ig_html_probe_next_request(const char*);
extern void ig_html_op(const char*,uint64_t,uint64_t,const char*,const char*,void(*)(uint64_t,const char*),uint64_t);
static void probe_ignore(uint64_t ticket,const char*raw){}
#endif
static NSString *const IGCSP=@"default-src 'none'; script-src 'none'; connect-src 'none'; style-src ig-html: 'unsafe-inline'; img-src ig-html:; font-src ig-html:; media-src 'none'; object-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-same-origin allow-scripts";
static void event(NSString *token,uint64_t generation,NSDictionary *value) {
 NSData *json=[NSJSONSerialization dataWithJSONObject:value options:0 error:nil];
 ig_html_event(token.UTF8String,generation,[[NSString alloc]initWithData:json encoding:NSUTF8StringEncoding].UTF8String);
}
@class IGHTMLSurface;
@interface IGHTMLWebView : WKWebView
@property(nonatomic,weak) IGHTMLSurface *owner;
@end
@interface IGHTMLSurface : NSObject<WKURLSchemeHandler,WKNavigationDelegate,WKUIDelegate>
@property(nonatomic,strong) IGHTMLWebView *web;
@property(nonatomic,copy) NSString *token;
@property(nonatomic,copy) NSString *initialURL;
@property(nonatomic) uint64_t generation;
@property(nonatomic) NSUInteger resourceRequests;
@property(nonatomic) BOOL disposed;
@property(nonatomic) BOOL initialPending;
@property(nonatomic) BOOL visible;
@property(nonatomic) BOOL ready;
#if IG_HTML_PROBE
@property(nonatomic) BOOL probeReadyRace;
#endif
@property(nonatomic) uint64_t operation;
@property(nonatomic) uint64_t request;
@property(nonatomic,strong) NSMutableSet *stopped;
@property(nonatomic,strong) id closeObserver;
@property(nonatomic,strong) id resizeObserver;
@property(nonatomic,strong) id resignObserver;
@property(nonatomic,strong) NSTimer *deadline;
- (void)dispose;
- (void)inspect:(NSString*)op args:(NSDictionary*)args completion:(void(^)(NSDictionary*))completion;
@end
@implementation IGHTMLWebView
- (NSMenu*)menuForEvent:(NSEvent*)event {return nil;}
- (BOOL)performKeyEquivalent:(NSEvent*)e {
 if((e.modifierFlags&NSEventModifierFlagCommand)&&[@[@"f",@"r",@"w",@"o"] containsObject:e.charactersIgnoringModifiers.lowercaseString]) {
  event(self.owner.token,self.owner.generation,@{@"event":@"shortcut",@"key":e.charactersIgnoringModifiers.lowercaseString,@"shift":@((e.modifierFlags&NSEventModifierFlagShift)!=0)});return YES;
 }
 return [super performKeyEquivalent:e];
}
@end
@implementation IGHTMLSurface
- (void)dispose {
 if(self.disposed)return;self.disposed=YES;self.operation++;
 [self.deadline invalidate];self.deadline=nil;
 for(id observer in @[self.closeObserver?:NSNull.null,self.resizeObserver?:NSNull.null,self.resignObserver?:NSNull.null])if(observer!=NSNull.null)[NSNotificationCenter.defaultCenter removeObserver:observer];
 self.closeObserver=nil;self.resizeObserver=nil;self.resignObserver=nil;
 [self.web stopLoading];[self.stopped removeAllObjects];self.web.navigationDelegate=nil;self.web.UIDelegate=nil;[self.web removeFromSuperview];self.web=nil;
}
- (void)inspect:(NSString*)op args:(NSDictionary*)args completion:(void(^)(NSDictionary*))completion {
 if(self.disposed){completion(@{@"error":@"stale_view"});return;}
 BOOL readiness=[op isEqual:@"ready"];uint64_t operation=readiness?self.operation:++self.operation;uint64_t request=self.request;
 [self.web callAsyncJavaScript:@IG_HTML_INSPECT arguments:@{@"op":op,@"args":args?:@{}} inFrame:nil inContentWorld:WKContentWorld.defaultClientWorld completionHandler:^(id value,NSError *error){
  if(self.disposed||(!readiness&&(operation!=self.operation||request!=self.request))){completion(@{@"error":@"stale_view"});return;}
  if(error||![value isKindOfClass:NSDictionary.class]){completion(@{@"error":@"html_render_failed"});return;}
  NSMutableDictionary *result=[value mutableCopy];if(!readiness)result[@"requestId"]=@(request);NSMutableDictionary *location=[result[@"location"] mutableCopy];
  if(location){location[@"zoom"]=@(self.web.magnification);result[@"location"]=location;}
  completion(result);
 }];
}
- (void)webView:(WKWebView*)web startURLSchemeTask:(id<WKURLSchemeTask>)task {
 if(self.disposed)return;
 NSString *url=task.request.URL.absoluteString;
 if(![task.request.URL.scheme isEqual:@"ig-html"]||![task.request.URL.host isEqual:self.token]) { [task didFailWithError:[NSError errorWithDomain:@"HTMLBroker" code:1 userInfo:nil]];return; }
 if(++self.resourceRequests>129){event(self.token,self.generation,@{@"event":@"resource_issue",@"url":url,@"reason":@"limit"});[task didFailWithError:[NSError errorWithDomain:@"HTMLBroker" code:3 userInfo:nil]];return;}
 static dispatch_queue_t queue;static dispatch_once_t once;dispatch_once(&once,^{queue=dispatch_queue_create("dev.intentgrove.html-resource",DISPATCH_QUEUE_SERIAL);});
 NSString *token=self.token;NSValue *key=[NSValue valueWithNonretainedObject:task];
 dispatch_async(queue,^{
  IGBytes bytes=ig_html_resource(token.UTF8String,url.UTF8String);
  NSData *data=bytes.data?[NSData dataWithBytes:bytes.data length:bytes.len]:nil;
  NSString *mime=bytes.mime?[NSString stringWithUTF8String:bytes.mime]:nil;ig_html_release(bytes);
  dispatch_async(dispatch_get_main_queue(),^{
   BOOL stopped=[self.stopped containsObject:key];[self.stopped removeObject:key];
   if(self.disposed||stopped)return;
   if(!data){[task didFailWithError:[NSError errorWithDomain:@"HTMLBroker" code:2 userInfo:nil]];return;}
   NSHTTPURLResponse *response=[[NSHTTPURLResponse alloc]initWithURL:task.request.URL statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:@{@"Content-Type":mime,@"Content-Security-Policy":IGCSP,@"X-Content-Type-Options":@"nosniff",@"X-DNS-Prefetch-Control":@"off",@"Cache-Control":@"no-store",@"Content-Length":@(data.length).stringValue}];
   [task didReceiveResponse:response];[task didReceiveData:data];[task didFinish];
  });
 });
}
- (void)webView:(WKWebView*)web stopURLSchemeTask:(id<WKURLSchemeTask>)task {if(!self.disposed)[self.stopped addObject:[NSValue valueWithNonretainedObject:task]];}
- (void)webView:(WKWebView*)web decidePolicyForNavigationAction:(WKNavigationAction*)action decisionHandler:(void(^)(WKNavigationActionPolicy))decision {
 BOOL initial=self.initialPending&&action.targetFrame.isMainFrame&&[action.request.URL.absoluteString isEqual:self.initialURL]&&action.navigationType==WKNavigationTypeOther;
 if(initial){self.initialPending=NO;decision(WKNavigationActionPolicyAllow);return;}
 if(action.navigationType==WKNavigationTypeLinkActivated)event(self.token,self.generation,@{@"event":@"link",@"url":action.request.URL.absoluteString?:@""});
 else event(self.token,self.generation,@{@"event":@"navigation_blocked",@"url":action.request.URL.absoluteString?:@""});
 decision(WKNavigationActionPolicyCancel);
}
- (void)webView:(WKWebView*)web decidePolicyForNavigationResponse:(WKNavigationResponse*)response decisionHandler:(void(^)(WKNavigationResponsePolicy))decision {
 decision(response.isForMainFrame&&[response.response.URL.absoluteString isEqual:self.initialURL]&&response.canShowMIMEType?WKNavigationResponsePolicyAllow:WKNavigationResponsePolicyCancel);
}
- (WKWebView*)webView:(WKWebView*)web createWebViewWithConfiguration:(WKWebViewConfiguration*)configuration forNavigationAction:(WKNavigationAction*)action windowFeatures:(WKWindowFeatures*)features {return nil;}
- (void)webView:(WKWebView*)web didFinishNavigation:(WKNavigation*)navigation {
 // Keep the load watchdog until trusted readiness inspection completes.
 // Disable explicit submit/file controls; presentation-only form controls remain temporary.
 [self.web callAsyncJavaScript:@"for(const e of document.querySelectorAll('button:not([type]),button[type=submit],input[type=submit],input[type=image],input[type=file]')){e.disabled=true;e.title='Submission and file selection are unavailable in this read-only view';}" arguments:@{} inFrame:nil inContentWorld:WKContentWorld.defaultClientWorld completionHandler:^(id v,NSError *e){
  [self inspect:@"ready" args:@{} completion:^(NSDictionary *value){
   if(self.disposed)return;[self.deadline invalidate];self.deadline=nil;
   NSMutableDictionary *out=[value mutableCopy];out[@"event"]=value[@"error"]?@"failed":@"ready";self.ready=value[@"error"]==nil;self.web.hidden=!self.ready||!self.visible;event(self.token,self.generation,out);
  }];
#if IG_HTML_PROBE
  if(self.probeReadyRace){
   uint64_t request=ig_html_probe_next_request(self.token.UTF8String);
   NSData *data=[NSJSONSerialization dataWithJSONObject:@{@"bounds":@{@"x":@0,@"y":@0,@"width":@900,@"height":@660},@"visible":@YES} options:0 error:nil];
   NSString *json=[[NSString alloc]initWithData:data encoding:NSUTF8StringEncoding];
   ig_html_op(self.token.UTF8String,self.generation,request,"viewport",json.UTF8String,probe_ignore,0);
  }
#endif
 }];
}
- (void)webView:(WKWebView*)web didFailNavigation:(WKNavigation*)navigation withError:(NSError*)error {event(self.token,self.generation,@{@"event":@"failed"});}
- (void)webView:(WKWebView*)web didFailProvisionalNavigation:(WKNavigation*)navigation withError:(NSError*)error {event(self.token,self.generation,@{@"event":@"failed"});}
- (void)webViewWebContentProcessDidTerminate:(WKWebView*)web {event(self.token,self.generation,@{@"event":@"failed"});[self dispose];}
- (void)webView:(WKWebView*)web requestMediaCapturePermissionForOrigin:(WKSecurityOrigin*)origin initiatedByFrame:(WKFrameInfo*)frame type:(WKMediaCaptureType)type decisionHandler:(void(^)(WKPermissionDecision))decision {decision(WKPermissionDecisionDeny);}
@end
static NSMutableDictionary<NSString*,IGHTMLSurface*> *surfaces;
static NSRect frame(NSView *parent,double x,double y,double w,double h){return NSMakeRect(x,parent.bounds.size.height-y-h,w,h);}
bool ig_html_mount(void *parent,const char *token,uint64_t generation,uint64_t request,const char *url,double x,double y,double w,double h,bool visible) {
 if(!NSThread.isMainThread||!parent)return false;
 if(!surfaces)surfaces=[NSMutableDictionary dictionary];NSString *key=[NSString stringWithUTF8String:token];
 if(surfaces[key])return false;
 NSWindow *window=(__bridge NSWindow*)parent;
 IGHTMLSurface *surface=[IGHTMLSurface new];surface.token=key;surface.generation=generation;surface.request=request;surface.initialURL=[NSString stringWithUTF8String:url];surface.initialPending=YES;surface.visible=visible;surface.stopped=[NSMutableSet set];
 WKWebViewConfiguration *config=[WKWebViewConfiguration new];config.processPool=[WKProcessPool new];config.websiteDataStore=WKWebsiteDataStore.nonPersistentDataStore;
 config.defaultWebpagePreferences.allowsContentJavaScript=YES;config.preferences.javaScriptCanOpenWindowsAutomatically=NO;
 config.userContentController=[WKUserContentController new];[config setURLSchemeHandler:surface forURLScheme:@"ig-html"];
 IGHTMLWebView *web=[[IGHTMLWebView alloc]initWithFrame:frame(window.contentView,x,y,w,h) configuration:config];surface.web=web;web.owner=surface;
 web.navigationDelegate=surface;web.UIDelegate=surface;web.allowsBackForwardNavigationGestures=NO;web.allowsLinkPreview=NO;web.inspectable=NO;web.allowsMagnification=YES;web.hidden=YES;
 // No Tauri scripts, scheme, message handler, host object, opener or shared store.
 [window.contentView addSubview:web];surfaces[key]=surface;
 __weak IGHTMLSurface *weak=surface;
 surface.closeObserver=[NSNotificationCenter.defaultCenter addObserverForName:NSWindowWillCloseNotification object:window queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification*n){[weak dispose];[surfaces removeObjectForKey:key];}];
 // On resize, hide until frontend supplies fresh document bounds: never cover shell chrome.
 surface.resizeObserver=[NSNotificationCenter.defaultCenter addObserverForName:NSWindowDidResizeNotification object:window queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification*n){weak.visible=NO;weak.web.hidden=YES;}];
 surface.resignObserver=[NSNotificationCenter.defaultCenter addObserverForName:NSWindowDidResignKeyNotification object:window queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification*n){weak.visible=NO;weak.web.hidden=YES;}];
 NSString *rules=@"[{\"trigger\":{\"url-filter\":\"^https?:\"},\"action\":{\"type\":\"block\"}},{\"trigger\":{\"url-filter\":\"^wss?:\"},\"action\":{\"type\":\"block\"}},{\"trigger\":{\"url-filter\":\"^file:\"},\"action\":{\"type\":\"block\"}},{\"trigger\":{\"url-filter\":\"^ftp:\"},\"action\":{\"type\":\"block\"}}]";
 [WKContentRuleListStore.defaultStore compileContentRuleListForIdentifier:@"IntentgroveHTMLNoNetwork-v1" encodedContentRuleList:rules completionHandler:^(WKContentRuleList *rule,NSError *error){
  if(surface.disposed)return;
  if(!rule||error){event(key,generation,@{@"event":@"failed"});[surface dispose];return;}
  [web.configuration.userContentController addContentRuleList:rule];
  [web loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:surface.initialURL]]];
 }];
 surface.deadline=[NSTimer scheduledTimerWithTimeInterval:5 repeats:NO block:^(NSTimer*t){if(!surface.disposed){event(key,generation,@{@"event":@"failed"});[surface dispose];}}];
 return true;
}
void ig_html_op(const char *token,uint64_t generation,uint64_t request,const char *operation,const char *raw,void(*reply)(uint64_t,const char*),uint64_t ticket) {
 NSString *key=[NSString stringWithUTF8String:token],*op=[NSString stringWithUTF8String:operation];
 if([op isEqual:@"hide_all"]){for(IGHTMLSurface*s in surfaces.allValues){s.visible=NO;s.web.hidden=YES;s.operation++;}return;}
 if([op isEqual:@"dispose_all"]){for(IGHTMLSurface*s in surfaces.allValues)[s dispose];[surfaces removeAllObjects];return;}
 void(^finish)(NSDictionary*)=^(NSDictionary *value){NSData*d=[NSJSONSerialization dataWithJSONObject:value options:0 error:nil];reply(ticket,[[NSString alloc]initWithData:d encoding:NSUTF8StringEncoding].UTF8String);};
 IGHTMLSurface*s=surfaces[key];
 if([op isEqual:@"dispose"]){if(s.generation==generation){[s dispose];[surfaces removeObjectForKey:key];}finish(@{@"disposed":@YES});return;}
 if(!s||s.disposed||s.generation!=generation){finish(@{@"error":@"stale_view"});return;}
 s.request=request;
 NSData *data=[[NSString stringWithUTF8String:raw] dataUsingEncoding:NSUTF8StringEncoding];NSDictionary*args=[NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
 if([op isEqual:@"viewport"]){NSDictionary*b=args[@"bounds"];NSView*p=s.web.superview;s.web.frame=frame(p,[b[@"x"] doubleValue],[b[@"y"] doubleValue],[b[@"width"] doubleValue],[b[@"height"] doubleValue]);s.visible=[args[@"visible"] boolValue];s.web.hidden=!s.ready||!s.visible;finish(@{@"updated":@YES});return;}
 if([op isEqual:@"focus"]){if(s.web.hidden){finish(@{@"error":@"hidden_view"});return;}[s.web.window makeFirstResponder:s.web];finish(@{@"focused":@YES});return;}
 if([op isEqual:@"location"]){double zoom=[args[@"zoom"] doubleValue];s.web.magnification=MAX(.5,MIN(3,zoom));}
 [s inspect:op args:args completion:^(NSDictionary*value){if(value[@"location"]){NSMutableDictionary*out=[value mutableCopy];out[@"event"]=@"location";event(key,generation,out);}finish(value);}];
}
#if IG_HTML_PROBE
void *ig_html_probe_window(void) {
 [NSApplication sharedApplication];[NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];[NSApp finishLaunching];
 NSWindow*w=[[NSWindow alloc]initWithContentRect:NSMakeRect(100,100,900,700) styleMask:NSWindowStyleMaskTitled|NSWindowStyleMaskClosable|NSWindowStyleMaskResizable backing:NSBackingStoreBuffered defer:NO];
 w.title=@"Intentgrove HTML native disposable probe";w.releasedWhenClosed=NO;[w makeKeyAndOrderFront:nil];[NSApp activateIgnoringOtherApps:YES];return (__bridge_retained void*)w;
}
void ig_html_probe_poll(double seconds) {
 NSDate *until=[NSDate dateWithTimeIntervalSinceNow:seconds];
 do {
  NSEvent*e=[NSApp nextEventMatchingMask:NSEventMaskAny untilDate:[NSDate dateWithTimeIntervalSinceNow:.005] inMode:NSDefaultRunLoopMode dequeue:YES];if(e)[NSApp sendEvent:e];
  [NSRunLoop.currentRunLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:.005]];
 }while(until.timeIntervalSinceNow>0);
}
char *ig_html_probe_eval(const char *token,const char *script) {
 IGHTMLSurface*s=surfaces[[NSString stringWithUTF8String:token]];__block NSString*result=nil;
 [s.web evaluateJavaScript:[NSString stringWithUTF8String:script] inFrame:nil inContentWorld:WKContentWorld.defaultClientWorld completionHandler:^(id value,NSError*error){
  NSData*d=[NSJSONSerialization dataWithJSONObject:error?@{@"error":error.description}:@{@"value":value?:NSNull.null} options:NSJSONWritingFragmentsAllowed error:nil];result=[[NSString alloc]initWithData:d encoding:NSUTF8StringEncoding];
 }];
 NSDate*until=[NSDate dateWithTimeIntervalSinceNow:3];while(!result&&until.timeIntervalSinceNow>0)ig_html_probe_poll(.01);
 return strdup((result?:@"{\"error\":\"timeout\"}").UTF8String);
}
char *ig_html_probe_op_request(const char*token,uint64_t generation,uint64_t request,const char*op,const char*raw);
void ig_html_probe_race_viewport(const char*token){surfaces[[NSString stringWithUTF8String:token]].probeReadyRace=YES;}
static NSString*probeReply;
static void probe_reply(uint64_t ticket,const char*raw){probeReply=[NSString stringWithUTF8String:raw];}
char *ig_html_probe_op_request(const char*token,uint64_t generation,uint64_t request,const char*op,const char*raw){probeReply=nil;ig_html_op(token,generation,request,op,raw,probe_reply,1);NSDate*until=[NSDate dateWithTimeIntervalSinceNow:3];while(!probeReply&&until.timeIntervalSinceNow>0)ig_html_probe_poll(.01);return strdup((probeReply?:@"{\"error\":\"timeout\"}").UTF8String);}
bool ig_html_probe_snapshot(const char*token,const char*path) {
 if(![[NSString stringWithUTF8String:path] containsString:@"html-native-"])return false;
 IGHTMLSurface*s=surfaces[[NSString stringWithUTF8String:token]];__block BOOL done=NO,ok=NO;
 [s.web takeSnapshotWithConfiguration:nil completionHandler:^(NSImage*image,NSError*error){if(image&&!error){NSBitmapImageRep*bitmap=[[NSBitmapImageRep alloc]initWithData:image.TIFFRepresentation];NSData*png=[bitmap representationUsingType:NSBitmapImageFileTypePNG properties:@{}];ok=[png writeToFile:[NSString stringWithUTF8String:path] atomically:YES];}done=YES;}];
 NSDate*until=[NSDate dateWithTimeIntervalSinceNow:3];while(!done&&until.timeIntervalSinceNow>0)ig_html_probe_poll(.01);return ok;
}
char *ig_html_probe_pending_dispose(const char*token) {
 IGHTMLSurface*s=surfaces[[NSString stringWithUTF8String:token]];__block NSDictionary*value=nil;
 [s inspect:@"snapshot" args:@{} completion:^(NSDictionary*r){value=r;}];[s dispose];
 NSDate*until=[NSDate dateWithTimeIntervalSinceNow:3];while(!value&&until.timeIntervalSinceNow>0)ig_html_probe_poll(.01);
 NSData*d=[NSJSONSerialization dataWithJSONObject:value?:@{@"error":@"timeout"} options:0 error:nil];return strdup([[NSString alloc]initWithData:d encoding:NSUTF8StringEncoding].UTF8String);
}
void ig_html_probe_close(void*parent){NSWindow*w=CFBridgingRelease(parent);[w close];}
#endif
