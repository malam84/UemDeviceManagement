#!/usr/bin/env node

/*
 * (c) 2018 BlackBerry Limited. All rights reserved.
 */

require('shelljs/global');

module.exports = function(context) {
    var fs = context.requireCordovaModule('fs'),
        projectRoot = context.opts.projectRoot,
        path = context.requireCordovaModule('path'),
        iOSHelper = require('../../../src/ios/iOSHelper.js'),
        originalNameOfiOSProject = new iOSHelper.PlistHelper(context).originalNameOfiOSProject,
        storyboardPath = path.join(projectRoot, 'plugins', 'cordova-plugin-bbd-base', 'src', 'ios', 'resources', 'LaunchScreen.storyboard');

    // Manage LaunchScreen.storyboard file to have actual ${PRODUCT_NAME}
    chmod(660, storyboardPath);
    if (fs.existsSync(storyboardPath)) {
        var storyboardContent = fs.readFileSync(storyboardPath, { encoding: 'utf8' });

        if (storyboardContent.indexOf('PRODUCT_NAME') > 0) {
            storyboardContent = storyboardContent.replace('PRODUCT_NAME', originalNameOfiOSProject);
            fs.writeFileSync(storyboardPath, storyboardContent, { encoding: 'utf8' });
        }
    }
}
