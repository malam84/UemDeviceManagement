#!/usr/bin/env node

/*
 * (c) 2018 BlackBerry Limited. All rights reserved.
 */

// This hook is used for AndroidManifest.xml, settings.json, settings.gradle, project.properties files
// configuration after the Base plugin was installed on android platform.
// NOTE: the manifest file can be self-restored during plugin installation (during platform adding process.)
// Fixed by after_plugin_add android hook.

var os = require('os');
var fse = require('fs-extra');
require('shelljs/global');

module.exports = function(context) {

    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path');

    var platformRoot = path.join(context.opts.projectRoot, 'platforms', 'android'),
        manifestFilePath = path.join(platformRoot, 'app', 'src', 'main', 'AndroidManifest.xml'),
        ManifestHelper = require('../../../src/android/AndroidHelper.js').ManifestHelper,
        CommonHelper = require('../../../src/android/AndroidHelper.js').CommonHelper,
        SettingsJsonHelper = require('../../../src/android/AndroidHelper.js').SettingsJsonHelper;

    var basePluginProjectPath = path.join(context.opts.projectRoot, 'plugins', 'cordova-plugin-bbd-base'),
        pathToAndroidPlatform = path.join(context.opts.projectRoot, 'platforms', 'android');

    var manifest = new ManifestHelper(manifestFilePath),
        settingsJson = new SettingsJsonHelper(context),
        packageName = manifest.packageName();

    settingsJson.addProperty("GDApplicationID", packageName);
    settingsJson.writeSync();
    settingsJson.chmodSync('777');

    // Update Android Sdk Version
    var configXmlPath = path.join(context.opts.projectRoot, 'config.xml'),
        ConfigParser = require('cordova-common').ConfigParser,
        configXmlObj = new ConfigParser(configXmlPath),
        cordovaLibManifestXmlPath = path.join(platformRoot, 'CordovaLib', 'AndroidManifest.xml'),
        cordovaLibManifestHelperObj = new ManifestHelper(cordovaLibManifestXmlPath),
        dataForManifestXml = [
            { location: './uses-sdk', attrName: 'android:minSdkVersion', value: '23' },
            { location: './uses-sdk', attrName: 'android:targetSdkVersion', value: '27' }
        ];

    configXmlObj.setGlobalPreference('android-minSdkVersion', 23);
    configXmlObj.setGlobalPreference('android-targetSdkVersion', 27);
    configXmlObj.write();

    // Update Android SDK Version in root build.gradle (Cordova 8.0.0)
    var rootBuildGradlePath = path.join(platformRoot, 'build.gradle'),
        rootBuildGradleContent = fs.readFileSync(rootBuildGradlePath, 'utf-8');

    rootBuildGradleContent = rootBuildGradleContent.replace('defaultMinSdkVersion=19', 'defaultMinSdkVersion=23');
    fs.writeFileSync(rootBuildGradlePath, rootBuildGradleContent, 'utf-8');

    setPropertiesInManifestObj(cordovaLibManifestHelperObj);

    console.log('\x1b[32m%s\x1b[0m', 'Plugin cordova-plugin-bbd-base was successfully installed for android.');

    function setPropertiesInManifestObj(obj) {
        for (var attr in dataForManifestXml) {
            var attrObj = dataForManifestXml[attr];
            obj.setAttribute(attrObj);
        }
        obj.writeSync();
    }

};
