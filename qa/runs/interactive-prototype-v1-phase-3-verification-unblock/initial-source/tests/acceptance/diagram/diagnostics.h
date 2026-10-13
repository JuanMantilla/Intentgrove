// Included only by the separately compiled diagnostic helper. Never a production capability.
static NSString *diagMode;
static void diag(NSString *kind, id value) {
 NSData *data=[NSJSONSerialization dataWithJSONObject:@{@"event":kind,@"value":value?:@"",@"pid":@(getpid()),@"ppid":@(getppid()),@"time":@([NSProcessInfo processInfo].systemUptime)} options:0 error:nil];
 fwrite(data.bytes,1,data.length,stderr);fputc('\n',stderr);fflush(stderr);
}
static void diagReply(NSMutableDictionary *reply, NSData **png) {
 if([diagMode isEqual:@"token"])reply[@"token"]=@"forged";
 if([diagMode isEqual:@"job"])reply[@"jobId"]=@"other";
 if([diagMode isEqual:@"digest"])reply[@"sourceDigest"]=@"forged";
 if([diagMode isEqual:@"generation"])reply[@"generation"]=@999;
 if([diagMode isEqual:@"version"])reply[@"version"]=@2;
 if([diagMode isEqual:@"unknown"])reply[@"unexpected"]=@1;
 if([diagMode isEqual:@"length"])reply[@"byteLength"]=@1;
 if([diagMode isEqual:@"dimensions"])reply[@"width"]=@2049;
 if([diagMode isEqual:@"ihdr"])reply[@"width"]=@1;
 if([diagMode isEqual:@"invalid-png"]){*png=[NSMutableData dataWithLength:24];reply[@"byteLength"]=@24;}
 if([diagMode isEqual:@"oversized"]){*png=[NSMutableData dataWithLength:4194305];reply[@"byteLength"]=@4194305;}
 if([diagMode isEqual:@"malformed"]){fputs("{broken\n",stdout);fflush(stdout);exit(0);}
 if([diagMode isEqual:@"truncated"]){reply[@"byteLength"]=@((*png).length+1);}
 if([diagMode isEqual:@"header-limit"]){for(int i=0;i<4097;i++)fputc(' ',stdout);}
}
static void diagNative(void) {
 // Read only a disposable probe path, with no document grants.
 NSString *path=NSProcessInfo.processInfo.environment[@"INTENTGROVE_DIAG_FILE"];
 errno=0;FILE *f=fopen(path.fileSystemRepresentation,"rb");int e=errno;if(f)fclose(f);diag(@"native-file",@{@"allowed":@(f!=NULL),@"errno":@(e)});
 int s=socket(AF_INET,SOCK_STREAM,0);struct sockaddr_in a={0};a.sin_family=AF_INET;a.sin_port=htons(9);a.sin_addr.s_addr=htonl(INADDR_LOOPBACK);errno=0;int r=connect(s,(struct sockaddr *)&a,sizeof a);e=errno;close(s);diag(@"native-network",@{@"result":@(r),@"errno":@(e)});
}
