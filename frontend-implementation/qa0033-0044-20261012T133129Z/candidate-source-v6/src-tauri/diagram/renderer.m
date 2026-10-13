#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#include <unistd.h>
#import <dispatch/dispatch.h>
#include <errno.h>
#include <sys/socket.h>
#include <netinet/in.h>
extern int md_diagram_raster(const uint8_t *, size_t, uint32_t, uint8_t **, size_t *, uint32_t *, uint32_t *);
#ifdef INTENTGROVE_DIAGNOSTICS
#include "../../tests/acceptance/diagram/diagnostics.h"
#endif
static NSDictionary *request; static WebView *web; static NSWindow *host;
static void writeReply(NSDictionary *result,NSData *png){NSMutableDictionary *reply=[result mutableCopy];reply[@"version"]=@1;reply[@"jobId"]=request[@"jobId"]?:@"";reply[@"token"]=request[@"token"]?:@"";reply[@"sourceDigest"]=request[@"sourceDigest"]?:@"";reply[@"generation"]=request[@"generation"]?:@0;reply[@"byteLength"]=@(png.length);
#ifdef INTENTGROVE_DIAGNOSTICS
 diagReply(reply,&png);
#endif
 NSData *data=[NSJSONSerialization dataWithJSONObject:reply options:0 error:nil];if(!data||data.length>4096||png.length>4194304)exit(12);fwrite(data.bytes,1,data.length,stdout);fputc('\n',stdout);if(png.length)fwrite(png.bytes,1,png.length,stdout);fflush(stdout);exit(0);}
static void finish(NSDictionary *result){writeReply(result,nil);}
@interface Renderer : NSObject <WebFrameLoadDelegate,WebResourceLoadDelegate,WebPolicyDelegate,WebUIDelegate> @end
@implementation Renderer
- (void)webView:(WebView *)sender runJavaScriptAlertPanelWithMessage:(NSString *)message initiatedByFrame:(WebFrame *)frame {/* Never display document-controlled alerts. */
#ifdef INTENTGROVE_DIAGNOSTICS
 if([message hasPrefix:@"INTENTGROVE_DIAG:"])diag(@"js",[message substringFromIndex:17]);
#endif
}
- (NSURLRequest *)webView:(WebView *)view resource:(id)identifier willSendRequest:(NSURLRequest *)req redirectResponse:(NSURLResponse *)redirect fromDataSource:(WebDataSource *)source {

#ifdef INTENTGROVE_DIAGNOSTICS
 diag(@"resource",@{@"url":req.URL.absoluteString?:@"",@"redirect":@(redirect!=nil)});
#endif
 NSURL *base=NSBundle.mainBundle.resourceURL;NSString *path=req.URL.path;
 if(!redirect && [req.URL.scheme isEqual:@"file"] && ([path isEqual:[base URLByAppendingPathComponent:@"index.html"].path]||[path isEqual:[base URLByAppendingPathComponent:@"reader.bundle.js"].path]))return req;
 return nil;
}
- (void)webView:(WebView *)view decidePolicyForNavigationAction:(NSDictionary *)action request:(NSURLRequest *)req frame:(WebFrame *)frame decisionListener:(id<WebPolicyDecisionListener>)listener {

#ifdef INTENTGROVE_DIAGNOSTICS
 diag(@"navigation",req.URL.absoluteString?:@"");
#endif
 if(frame==web.mainFrame && [req.URL.path isEqual:[NSBundle.mainBundle.resourceURL URLByAppendingPathComponent:@"index.html"].path] && [req.URL.scheme isEqual:@"file"])[listener use];else [listener ignore];
}
- (WebView *)webView:(WebView *)sender createWebViewWithRequest:(NSURLRequest *)request {
#ifdef INTENTGROVE_DIAGNOSTICS
 diag(@"popup",request.URL.absoluteString?:@"");
#endif
 return nil;}
- (void)webView:(WebView *)view didFailLoadWithError:(NSError *)error forFrame:(WebFrame *)frame {finish(@{@"error":@"helper_load_failed",@"detail":error.localizedDescription});}
- (void)webView:(WebView *)view didFinishLoadForFrame:(WebFrame *)frame {
 if(frame!=web.mainFrame)return;

#ifdef INTENTGROVE_DIAGNOSTICS
 NSData *modeData=[NSJSONSerialization dataWithJSONObject:@[diagMode?:@""] options:0 error:nil];
 NSString *modeJSON=[[NSString alloc] initWithData:modeData encoding:NSUTF8StringEncoding];
 [web stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"window.__diagMode=(%@)[0]",modeJSON]];
#endif
 NSString *data=[[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:request options:0 error:nil] encoding:NSUTF8StringEncoding];
 [web stringByEvaluatingJavaScriptFromString:[NSString stringWithFormat:@"window.runDiagram(%@)",data]];
 [NSTimer scheduledTimerWithTimeInterval:0.02 target:self selector:@selector(check:) userInfo:nil repeats:YES];
}
- (void)check:(NSTimer *)timer {
 
 NSString *json=[web stringByEvaluatingJavaScriptFromString:@"JSON.stringify(window.__diagramReply || null)"];
 if(!json||[json isEqual:@"null"])return;if(json.length>5700000){finish(@{@"error":@"invalid_reply"});return;}
 NSDictionary *value=[NSJSONSerialization JSONObjectWithData:[json dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];if(![value isKindOfClass:NSDictionary.class])return;
 if(![value[@"token"] isEqual:request[@"token"]]||![value[@"jobId"] isEqual:request[@"jobId"]]||![value[@"generation"] isEqual:request[@"generation"]]||![value[@"sourceDigest"] isEqual:request[@"sourceDigest"]])return;
 if(value[@"error"]){finish(@{@"error":@"diagram_rejected"});return;}
 if(![value[@"width"] isKindOfClass:NSNumber.class]||![value[@"height"] isKindOfClass:NSNumber.class])return;
 NSInteger w=[value[@"width"] integerValue],h=[value[@"height"] integerValue];if(w<1||h<1||w>2048||h>2048||w*h>4194304){finish(@{@"error":@"diagram_output_limit"});return;}
 NSData *svg=[value[@"svg"] dataUsingEncoding:NSUTF8StringEncoding];if(!svg||svg.length>1048576){finish(@{@"error":@"svg_limit"});return;}uint8_t *out=NULL;size_t length=0;uint32_t width=0,height=0;
 int result=md_diagram_raster(svg.bytes,svg.length,2048,&out,&length,&width,&height);if(result||!out||length>4194304||width>2048||height>2048){if(out)free(out);finish(@{@"error":@"snapshot_failed"});return;}
 NSData *png=[NSData dataWithBytesNoCopy:out length:length freeWhenDone:YES];writeReply(@{@"width":@(width),@"height":@(height)},png);
}
@end
int main(){@autoreleasepool{
 dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 3*NSEC_PER_SEC),dispatch_get_global_queue(QOS_CLASS_UTILITY,0),^{_exit(13);});
 NSMutableData *input=[NSMutableData data];uint8_t block[4096];ssize_t n;while((n=read(0,block,sizeof block))>0){if(input.length+n>40000)return 10;[input appendBytes:block length:n];}request=[NSJSONSerialization JSONObjectWithData:input options:0 error:nil];if(![request isKindOfClass:NSDictionary.class])return 11;
 if(![request[@"version"] isEqual:@1]||![request[@"generation"] isKindOfClass:NSNumber.class]||[request[@"generation"] unsignedLongLongValue]==0)return 11;
 for(NSString *key in @[@"token",@"sourceDigest"]){id value=request[key];if(![value isKindOfClass:NSString.class]||[value length]!=64||[value rangeOfCharacterFromSet:[[NSCharacterSet characterSetWithCharactersInString:@"0123456789abcdef"] invertedSet]].location!=NSNotFound)return 11;}
 if(![request[@"jobId"] isKindOfClass:NSString.class]||[request[@"jobId"] length]>64)return 11;


#ifdef INTENTGROVE_DIAGNOSTICS
 diagMode=NSProcessInfo.processInfo.environment[@"INTENTGROVE_DIAG_MODE"]?:@"";
 diag(@"started",diagMode);if([diagMode isEqual:@"resources"])diagNative();
#endif
 [NSApplication sharedApplication];[NSApp setActivationPolicy:NSApplicationActivationPolicyProhibited];Renderer *delegate=[Renderer new];
 WebPreferences *prefs=[[WebPreferences alloc] initWithIdentifier:nil];prefs.autosaves=NO;prefs.privateBrowsingEnabled=YES;prefs.javaScriptEnabled=YES;prefs.javaScriptCanOpenWindowsAutomatically=NO;prefs.plugInsEnabled=NO;prefs.loadsImagesAutomatically=NO;
 web=[[WebView alloc] initWithFrame:NSMakeRect(0,0,2048,2048) frameName:nil groupName:nil];web.preferences=prefs;web.frameLoadDelegate=delegate;web.resourceLoadDelegate=delegate;web.policyDelegate=delegate;web.UIDelegate=delegate;web.maintainsBackForwardList=NO;
 host=[[NSWindow alloc] initWithContentRect:NSMakeRect(-10000,-10000,2048,2048) styleMask:NSWindowStyleMaskBorderless backing:NSBackingStoreBuffered defer:NO];host.contentView=web;[web.mainFrame loadRequest:[NSURLRequest requestWithURL:[NSBundle.mainBundle.resourceURL URLByAppendingPathComponent:@"index.html"]]];[NSApp run];return 0;
}}
