/*
 * (c) 2017 BlackBerry Limited. All rights reserved.
 */

#import <Foundation/Foundation.h>
#import <Cordova/CDV.h>

@interface GDCBasePlugin : CDVPlugin

@property (nonatomic, copy) NSString *callbackID;

+(void)registerPlugin:(NSObject *)plugin;

-(void) writePluginResultForId:(NSString*)acallbackID asDictionary:(NSDictionary*)dictionary isError:(BOOL)isError asKeepAlive:(BOOL)keepAlive;
-(void) writePluginResultForId:(NSString*)acallbackID asDictionary:(NSDictionary*)dictionary isError:(BOOL)isError;
-(void) writePluginResultForId:(NSString*)acallbackID asString:(NSString*)resultString isError:(BOOL)isError asKeepAlive:(BOOL)keepAlive;
-(void) writePluginResultForId:(NSString*)callbackID asString:(NSString*)resultString isError:(BOOL)isError;
-(void) writePluginResultForId:(NSString*)callbackID asString:(NSString*)resultString;
-(const char*)getInputArgAsChar:(id)arg;
-(NSString*)getInputArgAsNSString:(id)arg;
-(BOOL)getInputArgAsBOOL:(id)arg withDefault:(BOOL)defaultValue;

@end
