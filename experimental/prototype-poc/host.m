// Disposable controller compiled with Intentgrove's unchanged native HTML surface.
#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#include <stdint.h>
#include <stdlib.h>
typedef struct { unsigned char *data; size_t len; char *mime; } IGBytes;
extern bool ig_html_mount(void*,const char*,uint64_t,uint64_t,const char*,double,double,double,double,bool);
extern void ig_html_probe_poll(double);
extern char *ig_html_probe_eval(const char*,const char*);
extern bool ig_html_probe_snapshot(const char*,const char*);
extern void ig_html_op(const char*,uint64_t,uint64_t,const char*,const char*,void(*)(uint64_t,const char*),uint64_t);
static NSMutableDictionary *resources;static NSMutableArray *events;static NSMutableArray *brokerLog;static BOOL ready;static NSWindow *window;
IGBytes ig_html_resource(const char *token,const char *url){
 @synchronized(brokerLog){[brokerLog addObject:[NSString stringWithUTF8String:url]];}
 IGBytes b={0};NSString*t=[NSString stringWithUTF8String:token];NSString*u=[NSString stringWithUTF8String:url];NSURLComponents*c=[NSURLComponents componentsWithString:u];
 if(![t isEqual:@"poc"]||![c.scheme isEqual:@"ig-html"]||![c.host isEqual:t]||c.query||c.fragment||c.port||c.user||c.password||[u containsString:@"%"]||[u containsString:@"\\"]||[c.path containsString:@".."]){return b;}
 NSData*d=resources[c.path];if(!d)return b;
 b.data=malloc(d.length);memcpy(b.data,d.bytes,d.length);b.len=d.length;b.mime=strdup([c.path hasSuffix:@".png"]?"image/png":"text/html");return b;
}
void ig_html_release(IGBytes b){free(b.data);free(b.mime);}
void ig_html_event(const char*t,uint64_t g,const char*raw){NSDictionary*d=[NSJSONSerialization JSONObjectWithData:[[NSString stringWithUTF8String:raw] dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];if(d){[events addObject:d];if([d[@"event"] isEqual:@"ready"])ready=YES;}}
uint64_t ig_html_probe_next_request(const char*t){return 1;}
static id eval(NSString*s){char*r=ig_html_probe_eval("poc",s.UTF8String);NSData*d=[[NSString stringWithUTF8String:r] dataUsingEncoding:NSUTF8StringEncoding];free(r);NSDictionary*v=[NSJSONSerialization JSONObjectWithData:d options:0 error:nil];if(v[@"error"])return v;return v[@"value"]?:NSNull.null;}
static NSString*json(id v){return [[NSString alloc]initWithData:[NSJSONSerialization dataWithJSONObject:v options:NSJSONWritingFragmentsAllowed error:nil] encoding:NSUTF8StringEncoding];}
static void reply(id v){puts(json(v).UTF8String);fflush(stdout);}
static id inspect(void){return eval(@"window.prototype.inspect()");}
static void noop(uint64_t t,const char*r){}
int main(int argc,char**argv){@autoreleasepool{
 if(argc!=2)return 2;NSString*script=[NSString stringWithContentsOfFile:[NSString stringWithUTF8String:argv[1]] encoding:NSUTF8StringEncoding error:nil];if(!script)return 3;
 resources=[NSMutableDictionary new];events=[NSMutableArray new];brokerLog=[NSMutableArray new];
 [NSApplication sharedApplication];[NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];[NSApp finishLaunching];
 window=[[NSWindow alloc]initWithContentRect:NSMakeRect(100,100,390,844) styleMask:NSWindowStyleMaskTitled|NSWindowStyleMaskClosable backing:NSBackingStoreBuffered defer:NO];window.title=@"Intentgrove disposable prototype POC";window.releasedWhenClosed=NO;[window makeKeyAndOrderFront:nil];[NSApp activateIgnoringOtherApps:YES];ig_html_probe_poll(.1);
 char *line=NULL;size_t cap=0;while(getline(&line,&cap,stdin)>0){@autoreleasepool{
  NSDictionary*q=[NSJSONSerialization JSONObjectWithData:[[NSString stringWithUTF8String:line] dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];NSString*op=q[@"op"];
  if([op isEqual:@"prototype.open"]){
   ready=NO;[events removeAllObjects];ig_html_op("poc",1,1,"dispose","{}",noop,0);[resources removeAllObjects];
   resources[@"/index.html"]=[@"<!doctype html><html><head><meta charset=utf-8></head><body>Loading prototype</body></html>" dataUsingEncoding:NSUTF8StringEncoding];
   NSDictionary*pkg=q[@"package"];for(NSString*n in pkg[@"assets"])resources[[@"/" stringByAppendingString:n]]=[[NSData alloc]initWithBase64EncodedString:pkg[@"assets"][n] options:0];
   NSDate*start=NSDate.date;
   bool mounted=ig_html_mount((__bridge void*)window,"poc",1,1,"ig-html://poc/index.html",0,0,390,844,true);
   NSDate*until=[NSDate dateWithTimeIntervalSinceNow:8];while(!ready&&until.timeIntervalSinceNow>0)ig_html_probe_poll(.01);
   if(!mounted||!ready){reply(@{@"error":@"native surface failed",@"events":events});continue;}
   id installed=eval(script);id state=eval([NSString stringWithFormat:@"window.prototype.open(%@)",json(pkg)]);ig_html_probe_poll(.15);
   reply(@{@"state":state,@"installation":installed,@"loadMs":@(-start.timeIntervalSinceNow*1000),@"events":events});
  }else if([op isEqual:@"prototype.click"]){
   id coord=eval([NSString stringWithFormat:@"window.prototype.click(%@,%@)",json(q[@"scene"]),json(q[@"target"])]);
   if(![coord isKindOfClass:NSDictionary.class]||coord[@"error"]){reply(@{@"error":coord?:@"coordinates"});continue;}
   [window makeKeyAndOrderFront:nil];[NSApp activateIgnoringOtherApps:YES];ig_html_probe_poll(.05);
   ig_html_op("poc",1,2,"viewport","{\"bounds\":{\"x\":0,\"y\":0,\"width\":390,\"height\":844},\"visible\":true}",noop,0);ig_html_op("poc",1,2,"focus","{}",noop,0);
   NSDate*start=NSDate.date;
   NSPoint point=NSMakePoint([coord[@"x"] doubleValue],844-[coord[@"y"] doubleValue]);
   for(NSNumber*type in @[@(NSEventTypeLeftMouseDown),@(NSEventTypeLeftMouseUp)]){NSEvent*e=[NSEvent mouseEventWithType:type.integerValue location:point modifierFlags:0 timestamp:NSProcessInfo.processInfo.systemUptime windowNumber:window.windowNumber context:nil eventNumber:1 clickCount:1 pressure:1];NSView*hit=[window.contentView hitTest:point];if(type.integerValue==NSEventTypeLeftMouseDown)[hit mouseDown:e];else [hit mouseUp:e];ig_html_probe_poll(.02);}
   id dispatch=@{@"transport":@"NSEvent"};
   ig_html_probe_poll(.15);reply(@{@"state":inspect(),@"clickMs":@(-start.timeIntervalSinceNow*1000),@"coordinates":coord,@"dispatch":dispatch});
  }else if([op isEqual:@"prototype.current_scene"]){reply(eval(@"window.prototype.current_scene()"));
  }else if([op isEqual:@"prototype.inspect"]){reply(inspect());
  }else if([op isEqual:@"prototype.reset"]){reply(eval(@"window.prototype.reset()"));ig_html_probe_poll(.1);
  }else if([op isEqual:@"prototype.screenshot"]){NSString*path=q[@"path"];ig_html_probe_poll(.1);reply(@{@"saved":@(ig_html_probe_snapshot("poc",path.UTF8String)),@"path":path});
  }else if([op isEqual:@"prototype.broker_log"]){@synchronized(brokerLog){reply([brokerLog copy]);}
  }else if([op isEqual:@"prototype.security_probe"]){
   // Fixed adversarial QA probe, never provided by a package or exposed as general eval.
   id r=eval(@"(()=>{const i=document.createElement('img');i.src='http://127.0.0.1:18765/probe';document.body.append(i);const s=document.createElement('script');s.textContent='window.packageScriptExecuted=true';document.body.append(s);return {tauri:typeof window.__TAURI_INTERNALS__,webkitHandlers:typeof window.webkit?.messageHandlers,pageScript:window.packageScriptExecuted===true}})()");
   ig_html_probe_poll(.2);IGBytes a=ig_html_resource("poc","ig-html://poc/../secret.png"),b=ig_html_resource("poc","file:///etc/passwd"),c=ig_html_resource("poc","ig-html://poc/assets/%2e%2e/secret.png");
   __block id pageResult=nil;for(NSView*v in window.contentView.subviews)if([v isKindOfClass:WKWebView.class])[(WKWebView*)v evaluateJavaScript:@"({scriptExecuted:window.packageScriptExecuted===true,playerExposed:typeof window.prototype,tauri:typeof window.__TAURI_INTERNALS__})" inFrame:nil inContentWorld:WKContentWorld.pageWorld completionHandler:^(id value,NSError*error){pageResult=value?:@{@"error":error.description?:@"page probe"};}];NSDate*until=[NSDate dateWithTimeIntervalSinceNow:3];while(!pageResult&&until.timeIntervalSinceNow>0)ig_html_probe_poll(.01);
   reply(@{@"clientWorld":r,@"pageWorld":pageResult?:NSNull.null,@"brokerTraversalDenied":@(a.data==NULL&&b.data==NULL&&c.data==NULL),@"events":events});ig_html_release(a);ig_html_release(b);ig_html_release(c);
  }else if([op isEqual:@"quit"]){reply(@{@"closed":@YES});break;}else reply(@{@"error":@"unknown operation"});
 }}free(line);ig_html_op("poc",1,1,"dispose","{}",noop,0);[window close];return 0;
}}
