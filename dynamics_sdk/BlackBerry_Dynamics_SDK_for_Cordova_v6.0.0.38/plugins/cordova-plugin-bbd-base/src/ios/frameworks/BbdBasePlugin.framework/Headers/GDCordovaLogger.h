/*
 * (c) 2017 BlackBerry Limited. All rights reserved.
 */

#import <Foundation/Foundation.h>

@interface GDCordovaLogger : NSObject

/**
 * Logs a message with the GDC_LOG_DETAIL log level only available
 * when enabled via setting in Debug Menu
 */
+ (void)debug:(NSString * )format, ...;

/**
 * Logs a message with GDC_LOG_DETAIL log level
 */
+ (void)detail:(NSString * )format, ...;

/**
 * Logs a message with the GDC_LOG_INFO log level
 */
+ (void)info:(NSString * )format, ...;

/**
 * Logs a message with the GDC_LOG_WARNING log level
 */
+ (void)warn:(NSString * )format, ...;

/**
 * Logs a message with the GDC_LOG_ERROR log level
 */
+ (void)error:(NSString * )format, ...;

@end
