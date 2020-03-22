#!/usr/bin/env node

/*
 * (c) 2018 BlackBerry Limited. All rights reserved.
 */

var path = require('path'),
    fs = require('fs'),
    execSync = require('child_process').execSync;

function iOSHelper() {
    this.finalGdIOSSDKPath;
    this.finalGdAssetsBundlePath;
}

iOSHelper.prototype = {
    handleGdIOSSDKPassedByUser: function(bbdSDKForiOS) {
        // validate the values if they suppose to be correct
        // we do not need the path to be escaped as Node handles it itself
        var gdIOSSDKPath = bbdSDKForiOS.replace(/\\ /g, ' ');

        // execSync transforms ‘~’ to full path for different cases.
        // Regular expression here is for removing \n or \r that are in the end of string returned
        // by execSync it supports following cases:
        // ~username1/...
        // ~username2/...
        // ~/...
        gdIOSSDKPath = execSync('echo ' + gdIOSSDKPath, { encoding: 'utf-8' }).replace(/[\r\n]/g, '');

        var gdAssetsBundlePath = path.join(gdIOSSDKPath, 'Versions', 'A', 'Resources', 'GDAssets.bundle');
        if (!fs.existsSync(gdIOSSDKPath) || !fs.existsSync(gdAssetsBundlePath)) {
            throw new Error("BlackBerry Dynamics iOS SDK is not available at path you passed: " + gdIOSSDKPath + ". Please enter correct path.");
        } else {
            this.finalGdIOSSDKPath = gdIOSSDKPath;
            this.finalGdAssetsBundlePath = gdAssetsBundlePath;
        }
    },
    generateAutomaticPathToGdIOSSDK: function() {
        // check if user directory is available ("/Users/<user>/") on Mac
        if (!process.env.HOME) {
            throw new Error("Your user directory is not available");
        } else {
            console.log('\n\x1b[32m%s\x1b[0m', 'User path on Mac: ' + process.env.HOME);
        }

        // generate automatic path to BlackBerry Dynamics iOS SDK
        var gdIOSSDKAutomaticPath = path.join(process.env.HOME, 'Library', 'Application Support', 'BlackBerry', 'Good.platform', 'iOS', 'Frameworks', 'GD.framework');
        if (!fs.existsSync(gdIOSSDKAutomaticPath)) {
            throw new Error("BlackBerry Dynamics iOS SDK is not available at path: " + gdIOSSDKAutomaticPath);
        } else {
            this.finalGdIOSSDKPath = gdIOSSDKAutomaticPath;
        }
        var gdAssetsBundlePath = path.join(this.finalGdIOSSDKPath, 'Versions', 'A', 'Resources', 'GDAssets.bundle');
        if (!fs.existsSync(gdAssetsBundlePath)) {
            throw new Error("GDAssets.bundle is not available at path: " + gdAssetsBundlePath);
        } else {
            this.finalGdAssetsBundlePath = gdAssetsBundlePath;
        }
    },
}

exports.iOSHelper = iOSHelper;
