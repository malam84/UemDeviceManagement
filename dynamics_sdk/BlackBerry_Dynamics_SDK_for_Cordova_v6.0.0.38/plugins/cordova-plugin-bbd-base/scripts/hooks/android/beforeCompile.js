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

    //  Set custom configuration for Android

    if (fs.existsSync(path.join(context.opts.projectRoot, 'platforms', 'android'))) {

        var AndroidHelper = require('../../../src/android/AndroidHelper.js'),
            platformRoot = path.join(context.opts.projectRoot, 'platforms', 'android'),
            settingsJsonHelper = new AndroidHelper.SettingsJsonHelper(context),
            manifestFilePath = path.join(platformRoot, 'app', 'src', 'main', 'AndroidManifest.xml'),
            manifest = new AndroidHelper.ManifestHelper(manifestFilePath);

        if (configXmlObj.getPreference('GDEnterpriseSimulationMode', 'android').indexOf('true') > -1) {
            settingsJsonHelper.addProperty('GDLibraryMode', 'GDEnterpriseSimulation');
        } else if (configXmlObj.getPreference('GDEnterpriseSimulationMode', 'android').indexOf('false') > -1 || 
            !configXmlObj.getPreference('GDEnterpriseSimulationMode', 'android')) {
            settingsJsonHelper.addProperty('GDLibraryMode', 'GDEnterprise');
        }

        if (configXmlObj.getPreference('GDApplicationVersion', 'android')) {
            settingsJsonHelper.addProperty('GDApplicationVersion', configXmlObj.getPreference('GDApplicationVersion', 'android'));
        } else if (!configXmlObj.getPreference('GDApplicationVersion', 'android')) {
            settingsJsonHelper.addProperty('GDApplicationVersion', '1.0.0.0');
        }

        if (configXmlObj.getPreference('GDApplicationID', 'android')) {
            settingsJsonHelper.addProperty('GDApplicationID', configXmlObj.getPreference('GDApplicationID', 'android'));
        } else if (!configXmlObj.getPreference('GDApplicationID', 'android')) {
            settingsJsonHelper.addProperty('GDApplicationID', manifest.packageName());
        }

        settingsJsonHelper.writeSync();
    }
};
