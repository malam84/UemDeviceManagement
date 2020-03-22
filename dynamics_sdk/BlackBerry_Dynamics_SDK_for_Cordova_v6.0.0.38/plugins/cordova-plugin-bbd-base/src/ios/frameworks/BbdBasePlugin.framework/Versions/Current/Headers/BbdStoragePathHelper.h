/*
 * (c) 2017 BlackBerry Limited. All rights reserved.
 */

#import <Foundation/Foundation.h>

/**
 * Implementation of BbdStoragePathHelper.
 * Use to operate with paths.
 */

@interface BbdStoragePathHelper : NSObject

/**
 * @method secureStoragePath
 * Calculate the path to secure storage.
 * @return Full path to secure storage.
 */
+ (NSString*)secureStoragePath;

/**
 * @method relativePathFromFullPath
 * Calculate the path relatively secure storage path from full path passed.
 * @param fullPath Full path (contains the secure storage path)
 * @return The path relatively secure storage path.
 */
+ (NSString*)relativePathFromFullPath:(NSString*) fullPath;

/**
 * @method isPathContainsSecureStoragePath
 * This method used for processing the path and indicate the secure storage path in passed
 * @param path NSString object
 * @return YES if passed path contains secure storage path, otherwise NO.
 */
+ (BOOL)isPathContainsSecureStoragePath:(NSString*)path;

/**
 * @method fullPathWithStoragePath
 * This method is used for processing full path from relative path passed
 * @param path
 * @return the full path with secure storage path
 */
+ (NSString*)fullPathWithStoragePath:(NSString*)path;

/**
 * @method relativePathFromInboxPath
 * This method is used for processing the path to file received from Sender via AppKinetics
 * @param inboxPath NSSString - represents the path to received file
 * @return the path to recieved file without sender secure storage path
 */
+ (NSString*)relativePathFromInboxPath:(NSString *)inboxPath;

@end
