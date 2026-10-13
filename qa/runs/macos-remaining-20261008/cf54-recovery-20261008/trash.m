#import <Foundation/Foundation.h>
#include <unistd.h>
int main(void) { @autoreleasepool {
 NSFileManager *fm = NSFileManager.defaultManager;
 NSURL *source = [NSURL fileURLWithPath:@"/Applications/Intentgrove.app"];
 NSError *error = nil;
 NSDictionary *attrs = [fm attributesOfItemAtPath:source.path error:&error];
 if (!attrs || [attrs[NSFileOwnerAccountID] unsignedIntValue] != getuid()) return 2;
 NSURL *result = nil;
 if (![fm trashItemAtURL:source resultingItemURL:&result error:&error]) {
   fprintf(stderr,"%s\n",error.description.UTF8String); return 3;
 }
 NSDictionary *record = @{@"method":@"Foundation NSFileManager trashItemAtURL", @"source":source.path, @"recoverablePath":result.path, @"sourceAbsent":@(![fm fileExistsAtPath:source.path]), @"recoverableBundleExists":@([fm fileExistsAtPath:result.path])};
 NSData *data = [NSJSONSerialization dataWithJSONObject:record options:NSJSONWritingPrettyPrinted error:&error];
 puts([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding].UTF8String);
 return 0;
}}
