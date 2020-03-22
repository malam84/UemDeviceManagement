/*
 * (c) 2017 BlackBerry Limited. All rights reserved.
 */

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@interface BbdClientCertAssistant : NSObject

-(instancetype)initWithWebView:(UIWebView *)theWebView;

+(void)extendChallengeWithClientCert: (NSURLAuthenticationChallenge *)challenge;

@end
