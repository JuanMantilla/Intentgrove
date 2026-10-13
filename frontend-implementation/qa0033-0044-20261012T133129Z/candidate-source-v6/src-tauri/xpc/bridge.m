#import <Foundation/Foundation.h>
#import <ImageIO/ImageIO.h>
#import <dispatch/dispatch.h>
#include <stdint.h>
#include <stdlib.h>
#include <unistd.h>

extern int md_svg_raster(const uint8_t *bytes, size_t length, uint32_t max_dimension,
                         uint8_t **output, size_t *output_length, uint32_t *width, uint32_t *height);
extern int md_svg_raster_tile(const uint8_t *bytes, size_t length, uint32_t x, uint32_t y,
                             uint32_t size, uint8_t **output, size_t *output_length,
                             uint32_t *width, uint32_t *height);

@protocol MDImageDecoderProtocol
 - (void)decode:(NSData *)data protocolVersion:(NSNumber *)version requestId:(NSString *)requestId
    generation:(NSNumber *)generation claimed:(NSString *)claimed maxDimension:(NSNumber *)maxDimension
    withReply:(void (^)(NSString *replyId, NSNumber *replyGeneration, NSData *pixels, NSString *actual, NSNumber *width,
                         NSNumber *height, NSNumber *still, NSString *error))reply;
- (void)decodeTile:(NSData *)data protocolVersion:(NSNumber *)version requestId:(NSString *)requestId
    generation:(NSNumber *)generation claimed:(NSString *)claimed x:(NSNumber *)x y:(NSNumber *)y
    size:(NSNumber *)size withReply:(void (^)(NSString *replyId, NSNumber *replyGeneration, NSData *pixels, NSString *actual,
                                              NSNumber *width, NSNumber *height,
                                              NSString *error))reply;
@end

static NSString *MDActualFormat(NSString *uti) {
    if ([uti isEqualToString:@"public.png"]) return @"png";
    if ([uti isEqualToString:@"public.jpeg"]) return @"jpeg";
    if ([uti isEqualToString:@"com.compuserve.gif"]) return @"gif";
    if ([uti isEqualToString:@"org.webmproject.webp"] || [uti isEqualToString:@"public.webp"]) return @"webp";
    if ([uti isEqualToString:@"com.microsoft.bmp"]) return @"bmp";
    if ([uti isEqualToString:@"public.tiff"]) return @"tiff";
    if ([uti isEqualToString:@"public.heic"] || [uti isEqualToString:@"public.heif"]
        || [uti isEqualToString:@"public.heic-sequence"] || [uti isEqualToString:@"public.heif-sequence"])
        return @"heif";
    return nil;
}

@interface MDImageDecoder : NSObject <MDImageDecoderProtocol>
@end
@implementation MDImageDecoder
- (void)decode:(NSData *)data protocolVersion:(NSNumber *)version requestId:(NSString *)requestId
    generation:(NSNumber *)generation claimed:(NSString *)claimed maxDimension:(NSNumber *)maxDimension
    withReply:(void (^)(NSString *, NSNumber *, NSData *, NSString *, NSNumber *, NSNumber *, NSNumber *, NSString *))reply {
    @autoreleasepool {
        __block BOOL done = NO;
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 4800 * NSEC_PER_MSEC),
                       dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
            @synchronized (self) { if (!done) _exit(70); }
        });
        void (^finish)(NSData *, NSString *, NSNumber *, NSNumber *, NSNumber *, NSString *) =
            ^(NSData *pixels, NSString *actual, NSNumber *width, NSNumber *height,
              NSNumber *still, NSString *error) {
                @synchronized (self) { done = YES; }
                reply(requestId, generation, pixels, actual, width, height, still, error);
            };
        if (version.unsignedIntValue != 1 || requestId.length != 36 || !generation) {
            finish(nil, nil, nil, nil, nil, @"invalid_request"); return;
        }
        if (data.length == 0 || data.length > 8 * 1024 * 1024 || claimed.length > 16) {
            finish(nil, nil, nil, nil, nil, @"over_limit"); return;
        }
        uint32_t limit = (uint32_t)MIN(MAX(maxDimension.unsignedIntValue, 1), 4096);
        if ([claimed isEqualToString:@"svg"]) {
            uint8_t *output = NULL;
            size_t output_length = 0;
            uint32_t width = 0, height = 0;
            int svgStatus = md_svg_raster(data.bytes, data.length, limit, &output, &output_length,
                                          &width, &height);
            if (svgStatus != 0 || !output || output_length > 8 * 1024 * 1024) {
                free(output); finish(nil, nil, nil, nil, nil,
                                     svgStatus == -2 ? @"response_limit" : @"unsafe_or_corrupt"); return;
            }
            NSData *pixels = [NSData dataWithBytesNoCopy:output length:output_length freeWhenDone:YES];
            finish(pixels, @"svg", @(width), @(height), @NO, nil); return;
        }
        CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)data,
            (__bridge CFDictionaryRef)@{(__bridge NSString *)kCGImageSourceShouldCache: @NO});
        if (!source) { finish(nil, nil, nil, nil, nil, @"corrupt"); return; }
        CFStringRef actual_uti = CGImageSourceGetType(source);
        NSString *actual = actual_uti ? MDActualFormat((__bridge NSString *)actual_uti) : nil;
        if (!actual || ![actual isEqualToString:claimed]) {
            CFRelease(source); finish(nil, nil, nil, nil, nil, @"mismatch"); return;
        }
        NSDictionary *properties = CFBridgingRelease(CGImageSourceCopyPropertiesAtIndex(source, 0,
            (__bridge CFDictionaryRef)@{(__bridge NSString *)kCGImageSourceShouldCache: @NO}));
        uint64_t width = [properties[(__bridge NSString *)kCGImagePropertyPixelWidth] unsignedLongLongValue];
        uint64_t height = [properties[(__bridge NSString *)kCGImagePropertyPixelHeight] unsignedLongLongValue];
        if (!width || !height || width * height > 40000000 || width > UINT32_MAX || height > UINT32_MAX) {
            CFRelease(source); finish(nil, nil, nil, nil, nil, @"over_limit"); return;
        }
        BOOL still = CGImageSourceGetCount(source) > 1;
        NSUInteger orientation = [properties[(__bridge NSString *)kCGImagePropertyOrientation] unsignedIntegerValue];
        if (orientation >= 5 && orientation <= 8) {
            uint64_t temp = width; width = height; height = temp;
        }
        CGImageRef image = CGImageSourceCreateThumbnailAtIndex(source, 0,
            (__bridge CFDictionaryRef)@{
                (__bridge NSString *)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
                (__bridge NSString *)kCGImageSourceCreateThumbnailWithTransform: @YES,
                (__bridge NSString *)kCGImageSourceThumbnailMaxPixelSize: @(limit),
                (__bridge NSString *)kCGImageSourceShouldCache: @NO
            });
        CFRelease(source);
        if (!image) { finish(nil, nil, nil, nil, nil, @"corrupt"); return; }
        NSMutableData *pixels = [NSMutableData data];
        CGImageDestinationRef destination = CGImageDestinationCreateWithData((__bridge CFMutableDataRef)pixels,
            CFSTR("public.png"), 1, NULL);
        if (!destination) { CGImageRelease(image); finish(nil, nil, nil, nil, nil, @"corrupt"); return; }
        CGImageDestinationAddImage(destination, image, NULL);
        BOOL encoded = CGImageDestinationFinalize(destination);
        CFRelease(destination);
        CGImageRelease(image);
        if (!encoded || pixels.length == 0) {
            finish(nil, nil, nil, nil, nil, @"corrupt"); return;
        }
        if (pixels.length > 8 * 1024 * 1024) {
            finish(nil, nil, nil, nil, nil, @"response_limit"); return;
        }
        finish(pixels, actual, @((uint32_t)width), @((uint32_t)height), @(still), nil);
    }
}

- (void)decodeTile:(NSData *)data protocolVersion:(NSNumber *)version requestId:(NSString *)requestId
    generation:(NSNumber *)generation claimed:(NSString *)claimed x:(NSNumber *)x y:(NSNumber *)y
    size:(NSNumber *)size withReply:(void (^)(NSString *, NSNumber *, NSData *, NSString *, NSNumber *, NSNumber *, NSString *))reply {
    @autoreleasepool {
        __block BOOL done = NO;
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 4800 * NSEC_PER_MSEC),
                       dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
            @synchronized (self) { if (!done) _exit(70); }
        });
        void (^finish)(NSData *, NSString *, NSNumber *, NSNumber *, NSString *) =
            ^(NSData *pixels, NSString *actual, NSNumber *width, NSNumber *height, NSString *error) {
                @synchronized (self) { done = YES; }
                reply(requestId, generation, pixels, actual, width, height, error);
            };
        if (version.unsignedIntValue != 1 || requestId.length != 36 || !generation) {
            finish(nil, nil, nil, nil, @"invalid_request"); return;
        }
        if (!data.length || data.length > 8 * 1024 * 1024 || claimed.length > 16
            || size.unsignedIntValue != 1024) {
            finish(nil, nil, nil, nil, @"over_limit"); return;
        }
        uint32_t tileX = x.unsignedIntValue, tileY = y.unsignedIntValue;
        if ([claimed isEqualToString:@"svg"]) {
            uint8_t *output = NULL;
            size_t length = 0;
            uint32_t width = 0, height = 0;
            if (md_svg_raster_tile(data.bytes, data.length, tileX, tileY, 1024,
                                   &output, &length, &width, &height) != 0 || !output
                || length > 8 * 1024 * 1024) {
                free(output); finish(nil, nil, nil, nil, @"unsafe_or_corrupt"); return;
            }
            finish([NSData dataWithBytesNoCopy:output length:length freeWhenDone:YES],
                   @"svg", @(width), @(height), nil);
            return;
        }
        CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)data,
            (__bridge CFDictionaryRef)@{(__bridge NSString *)kCGImageSourceShouldCache: @NO});
        if (!source) { finish(nil, nil, nil, nil, @"corrupt"); return; }
        CFStringRef uti = CGImageSourceGetType(source);
        NSString *actual = uti ? MDActualFormat((__bridge NSString *)uti) : nil;
        if (!actual || ![actual isEqualToString:claimed]) {
            CFRelease(source); finish(nil, nil, nil, nil, @"mismatch"); return;
        }
        NSDictionary *properties = CFBridgingRelease(CGImageSourceCopyPropertiesAtIndex(source, 0,
            (__bridge CFDictionaryRef)@{(__bridge NSString *)kCGImageSourceShouldCache: @NO}));
        uint64_t width = [properties[(__bridge NSString *)kCGImagePropertyPixelWidth] unsignedLongLongValue];
        uint64_t height = [properties[(__bridge NSString *)kCGImagePropertyPixelHeight] unsignedLongLongValue];
        if (!width || !height || width > UINT32_MAX || height > UINT32_MAX
            || width * height > 40000000) {
            CFRelease(source); finish(nil, nil, nil, nil, @"over_limit"); return;
        }
        CGImageRef image = CGImageSourceCreateThumbnailAtIndex(source, 0,
            (__bridge CFDictionaryRef)@{
                (__bridge NSString *)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
                (__bridge NSString *)kCGImageSourceCreateThumbnailWithTransform: @YES,
                (__bridge NSString *)kCGImageSourceThumbnailMaxPixelSize: @(MAX(width, height)),
                (__bridge NSString *)kCGImageSourceShouldCache: @NO
            });
        CFRelease(source);
        if (!image) { finish(nil, nil, nil, nil, @"corrupt"); return; }
        uint64_t orientedWidth = CGImageGetWidth(image), orientedHeight = CGImageGetHeight(image);
        if (tileX >= orientedWidth || tileY >= orientedHeight) {
            CGImageRelease(image); finish(nil, nil, nil, nil, @"over_limit"); return;
        }
        CGRect rect = CGRectMake(tileX, tileY, MIN(1024, orientedWidth - tileX),
                                 MIN(1024, orientedHeight - tileY));
        CGImageRef crop = CGImageCreateWithImageInRect(image, rect);
        CGImageRelease(image);
        if (!crop) { finish(nil, nil, nil, nil, @"corrupt"); return; }
        NSMutableData *pixels = [NSMutableData data];
        CGImageDestinationRef destination = CGImageDestinationCreateWithData((__bridge CFMutableDataRef)pixels,
            CFSTR("public.png"), 1, NULL);
        if (!destination) { CGImageRelease(crop); finish(nil, nil, nil, nil, @"corrupt"); return; }
        CGImageDestinationAddImage(destination, crop, NULL);
        BOOL encoded = CGImageDestinationFinalize(destination);
        CFRelease(destination);
        CGImageRelease(crop);
        if (!encoded || !pixels.length || pixels.length > 8 * 1024 * 1024) {
            finish(nil, nil, nil, nil, @"over_limit"); return;
        }
        finish(pixels, actual, @(rect.size.width), @(rect.size.height), nil);
    }
}
@end

@interface MDImageListener : NSObject <NSXPCListenerDelegate>
@property (strong) MDImageDecoder *decoder;
@end
@implementation MDImageListener
- (BOOL)listener:(NSXPCListener *)listener shouldAcceptNewConnection:(NSXPCConnection *)connection {
    (void)listener;
    connection.exportedInterface = [NSXPCInterface interfaceWithProtocol:@protocol(MDImageDecoderProtocol)];
    connection.exportedObject = self.decoder;
    [connection resume];
    return YES;
}
@end

void md_image_xpc_main(void) {
    @autoreleasepool {
        MDImageListener *delegate = [MDImageListener new];
        delegate.decoder = [MDImageDecoder new];
        NSXPCListener *listener = [NSXPCListener serviceListener];
        listener.delegate = delegate;
        [listener resume];
        dispatch_main();
    }
}
