#import <Cocoa/Cocoa.h>
#include <stdbool.h>
extern bool md_reveal_file(const char *path);
int main(int argc, char **argv) {
    if (argc != 2) return 2;
    return md_reveal_file(argv[1]) ? 0 : 1;
}
