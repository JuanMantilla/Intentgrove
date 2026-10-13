#import <Foundation/Foundation.h>
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

extern int md_image_xpc_decode(const uint8_t *, size_t, const char *, uint32_t, uint64_t,
    uint8_t **, size_t *, uint32_t *, uint32_t *, int *, char **, char **);
extern int md_image_xpc_decode_tile(const uint8_t *, size_t, const char *, uint32_t, uint32_t, uint64_t,
    uint8_t **, size_t *, uint32_t *, uint32_t *, char **, char **);

int main(int argc, const char **argv) {
    @autoreleasepool {
        if (argc < 3 || argc > 5) return 2;
        NSData *input = [NSData dataWithContentsOfFile:[NSString stringWithUTF8String:argv[1]]];
        if (!input) return 3;
        BOOL benchmark = argc == 5 && strcmp(argv[4], "--bench20") == 0;
        if (benchmark) {
            double maximum = 0, total = 0;
            int completed = 0;
            for (int trial = 0; trial < 20; trial++) {
                uint8_t *trialOutput = NULL;
                size_t trialLength = 0;
                uint32_t trialWidth = 0, trialHeight = 0;
                int trialStill = 0;
                char *trialFormat = NULL, *trialError = NULL;
                struct timespec start, end;
                clock_gettime(CLOCK_MONOTONIC, &start);
                int trialStatus = md_image_xpc_decode(input.bytes, input.length, argv[2], 4096, 1,
                    &trialOutput, &trialLength, &trialWidth, &trialHeight, &trialStill,
                    &trialFormat, &trialError);
                clock_gettime(CLOCK_MONOTONIC, &end);
                double elapsed = (end.tv_sec - start.tv_sec) * 1000.0
                    + (end.tv_nsec - start.tv_nsec) / 1000000.0;
                total += elapsed;
                if (elapsed > maximum) maximum = elapsed;
                if (trialStatus == 0 && trialOutput && trialLength) completed++;
                free(trialOutput); free(trialFormat); free(trialError);
            }
            NSString *summary = [NSString stringWithFormat:
                @"completed=%d total=20 mean_ms=%.1f max_ms=%.1f", completed, total / 20, maximum];
            [summary writeToFile:[NSString stringWithUTF8String:argv[3]] atomically:YES
                      encoding:NSUTF8StringEncoding error:NULL];
            return completed == 20 ? 0 : 1;
        }
        uint8_t *output = NULL;
        size_t output_length = 0;
        uint32_t width = 0, height = 0;
        int still = 0;
        char *actual = NULL, *error = NULL;
        NSString *claim = [NSString stringWithUTF8String:argv[2]];
        NSArray<NSString *> *tileParts = [claim componentsSeparatedByString:@":"];
        BOOL tileMode = tileParts.count == 4 && [tileParts[0] isEqualToString:@"tile"];
        int status = tileMode
            ? md_image_xpc_decode_tile(input.bytes, input.length, tileParts[1].UTF8String,
                (uint32_t)tileParts[2].integerValue, (uint32_t)tileParts[3].integerValue, 1,
                &output, &output_length, &width, &height, &actual, &error)
            : md_image_xpc_decode(input.bytes, input.length, argv[2], 4096, 1,
                &output, &output_length, &width, &height, &still, &actual, &error);
        printf("status=%d format=%s width=%u height=%u still=%d bytes=%zu error=%s\n",
            status, actual ? actual : "", width, height, still, output_length, error ? error : "");
        if (argc >= 4) {
            NSString *result = [NSString stringWithFormat:@"status=%d format=%s width=%u height=%u bytes=%zu error=%s",
                status, actual ? actual : "", width, height, output_length, error ? error : ""];
            [result writeToFile:[NSString stringWithUTF8String:argv[3]] atomically:YES
                       encoding:NSUTF8StringEncoding error:NULL];
        }
        if (argc == 5 && status == 0) {
            NSData *pixels = [NSData dataWithBytes:output length:output_length];
            [pixels writeToFile:[NSString stringWithUTF8String:argv[4]] atomically:YES];
        }
        free(output); free(actual); free(error);
        return status;
    }
}
