#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#include <unistd.h>
#include <errno.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <sandbox.h>

static NSDictionary *request; static WKWebView *web; static NSWindow *host;
static void finish(NSDictionary *result) {
  NSMutableDictionary *reply=[result mutableCopy];reply[@"version"]=@1;reply[@"jobId"]=request[@"jobId"]?:@"";reply[@"token"]=request[@"token"]?:@"";reply[@"generation"]=request[@"generation"]?:@0;
  NSData *data=[NSJSONSerialization dataWithJSONObject:reply options:0 error:nil];
  if(data.length>5700000)exit(12);fwrite(data.bytes,1,data.length,stdout);fflush(stdout);exit(0);
}
@interface Renderer : NSObject <WKNavigationDelegate,WKScriptMessageHandler> @end
@implementation Renderer
- (void)webView:(WKWebView *)view didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error { finish(@{@"error":@"helper_load_failed",@"detail":error.localizedDescription}); }
- (void)webView:(WKWebView *)view didFinishNavigation:(WKNavigation *)navigation {
  [view callAsyncJavaScript:@"return await window.runDiagram(request)" arguments:@{@"request":request} inFrame:nil inContentWorld:WKContentWorld.pageWorld completionHandler:^(id value,NSError *error){ if(error)finish(@{@"error":@"helper_script_failed",@"detail":error.localizedDescription}); }];
}
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
  if(!message.frameInfo.mainFrame||![message.body isKindOfClass:NSDictionary.class])return;
  NSDictionary *value=message.body;
  if(![value[@"token"] isEqual:request[@"token"]]||![value[@"jobId"] isEqual:request[@"jobId"]]||![value[@"generation"] isEqual:request[@"generation"]])return;
  if(value[@"probe"]){finish(value);return;}
  if([value[@"error"] isKindOfClass:NSString.class]){finish(@{@"error":@"diagram_invalid"});return;}
  if(![value[@"width"] isKindOfClass:NSNumber.class]||![value[@"height"] isKindOfClass:NSNumber.class])return;
  NSInteger w=[value[@"width"] integerValue],h=[value[@"height"] integerValue];if(w<1||h<1||w>2048||h>2048||w*h>4194304){finish(@{@"error":@"diagram_output_limit"});return;}
  WKSnapshotConfiguration *config=[WKSnapshotConfiguration new];config.rect=NSMakeRect(0,0,w,h);config.snapshotWidth=@(w);config.afterScreenUpdates=YES;
  [web takeSnapshotWithConfiguration:config completionHandler:^(NSImage *image,NSError *error){
    if(error||!image){finish(@{@"error":@"snapshot_failed"});return;}
    NSBitmapImageRep *bitmap=[[NSBitmapImageRep alloc] initWithData:image.TIFFRepresentation];
    if(bitmap.pixelsWide>2048||bitmap.pixelsHigh>2048){finish(@{@"error":@"diagram_output_limit"});return;}
    NSData *png=[bitmap representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
    if(!png||png.length>4194304){finish(@{@"error":@"diagram_output_limit"});return;}
    finish(@{@"width":@(bitmap.pixelsWide),@"height":@(bitmap.pixelsHigh),@"png":[png base64EncodedStringWithOptions:0]});
  }];
}
@end
int main(int argc,const char **argv){@autoreleasepool{
  NSMutableData *input=[NSMutableData data];uint8_t block[4096];ssize_t n;
  while((n=read(STDIN_FILENO,block,sizeof block))>0){if(input.length+n>40000)return 10;[input appendBytes:block length:n];}
  request=[NSJSONSerialization JSONObjectWithData:input options:0 error:nil];if(![request isKindOfClass:NSDictionary.class])return 11;
  if([request[@"nativeProbe"] boolValue]){
    errno=0;FILE *f=fopen("/private/tmp/intentgrove-diagram-probe-sentinel","r");int fe=errno;if(f)fclose(f);
    int fd=socket(AF_INET,SOCK_STREAM,0);struct sockaddr_in address={.sin_family=AF_INET,.sin_port=htons(9),.sin_addr={htonl(INADDR_LOOPBACK)}};int c=connect(fd,(void *)&address,sizeof address),ce=errno;close(fd);
    finish(@{@"fileOpened":@(f!=NULL),@"fileErrno":@(fe),@"networkResult":@(c),@"networkErrno":@(ce)});
  }
  [NSApplication sharedApplication];[NSApp setActivationPolicy:NSApplicationActivationPolicyProhibited];
  Renderer *delegate=[Renderer new];WKWebViewConfiguration *config=[WKWebViewConfiguration new];config.websiteDataStore=WKWebsiteDataStore.nonPersistentDataStore;
  [config.userContentController addScriptMessageHandler:delegate name:@"result"];
  web=[[WKWebView alloc] initWithFrame:NSMakeRect(0,0,2048,2048) configuration:config];web.navigationDelegate=delegate;
  host=[[NSWindow alloc] initWithContentRect:NSMakeRect(-10000,-10000,2048,2048) styleMask:NSWindowStyleMaskBorderless backing:NSBackingStoreBuffered defer:NO];host.contentView=web;
  NSURL *base=NSBundle.mainBundle.resourceURL;[web loadFileURL:[base URLByAppendingPathComponent:@"index.html"] allowingReadAccessToURL:base];
  [NSApp run];return 0;
}}
