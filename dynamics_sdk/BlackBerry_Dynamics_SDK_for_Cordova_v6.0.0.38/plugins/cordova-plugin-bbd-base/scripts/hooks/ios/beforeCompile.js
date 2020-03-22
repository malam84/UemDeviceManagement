#!/usr/bin/env node

/*
 * (c) 2018 BlackBerry Limited. All rights reserved.
 */

module.exports = function(context) {

    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        configXmlPath = path.join(context.opts.projectRoot, 'config.xml'),
        ConfigParser = require('cordova-common').ConfigParser,
        configXmlObj = new ConfigParser(configXmlPath);

    //  Set custom configuration for iOS

    if (fs.existsSync(path.join(context.opts.projectRoot, 'platforms', 'ios'))) {

        var iOSHelper = require('../../../src/ios/iOSHelper.js'),
            plistHelper = new iOSHelper.PlistHelper(context);

        if (configXmlObj.getPreference('GDEnterpriseSimulationMode', 'ios') === 'true')
            plistHelper.addProperty('GDLibraryMode', 'GDEnterpriseSimulation');
        else if (configXmlObj.getPreference('GDEnterpriseSimulationMode', 'ios') !== 'true' ||
            !configXmlObj.getPreference('GDEnterpriseSimulationMode', 'ios'))
            plistHelper.removeProperty('GDLibraryMode');

        if (configXmlObj.getPreference('BBD_Enterprise_Discovery', 'ios') === 'true')
            plistHelper.addUrlScheme('com.good.gd.discovery.enterprise');
        else if (configXmlObj.getPreference('BBD_Enterprise_Discovery', 'ios') !== 'true' ||
            !configXmlObj.getPreference('BBD_Enterprise_Discovery', 'ios'))
            plistHelper.removeUrlScheme('com.good.gd.discovery.enterprise');

        if (configXmlObj.getPreference('GDApplicationID', 'ios'))
            plistHelper.addProperty('GDApplicationID', configXmlObj.getPreference('GDApplicationID', 'ios'));
        else if (!configXmlObj.getPreference('GDApplicationID', 'ios'))
            plistHelper.addProperty('GDApplicationID', plistHelper.plistObj.CFBundleIdentifier);

        if (configXmlObj.getPreference('GDApplicationVersion', 'ios'))
            plistHelper.addProperty('GDApplicationVersion', configXmlObj.getPreference('GDApplicationVersion', 'ios'));
        else if (!configXmlObj.getPreference('GDApplicationVersion', 'ios'))
            plistHelper.addProperty('GDApplicationVersion', '1.0.0.0');

        var faceIDPreference = configXmlObj.getPreference('addFaceIDUsage', 'ios').toLowerCase();
        if (!faceIDPreference || faceIDPreference !== 'off') {
            plistHelper.addProperty('NSFaceIDUsageDescription', plistHelper.bbdFaceIDUsageDescriptionMgs);
        }

        plistHelper.writeSync();
    }

};
