#!/usr/bin/env node

/*
 * (c) 2019 BlackBerry Limited. All rights reserved.
 */

module.exports = function(context) {
    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        execSync = require('child_process').execSync,
        osEol = require('os').EOL,
        supportedCordovaVersions = require(path.join('..', '..', 'package.json')).supportedCordovaVersions,
        command = process.env.CORDOVA_BIN || 'cordova', // process.env.CORDOVA_BIN is used for internal purposes
        currentCordovaVersion = execSync(command + ' -v').toString().match(/(\d\.){1,2}\d/)[0];

    if (!supportedCordovaVersions.includes(currentCordovaVersion)) {
        console.warn('\x1b[33m%s\x1b[0m', 'WARNING: BlackBerry Dynamics SDK for Cordova does not support ' + currentCordovaVersion +
        ' Cordova version.\nSupported versions:\n\t' + supportedCordovaVersions.join(',\n\t'));
    }

    // There is a strange bug, it seems Cordova bug.
    // When we add Configure plugin, then add Base plugin it installs Configure plugin one more time
    // even though Base plugin does not have any dependencies.
    // This results in unexpected behaviour and we need to hack this.
    // The fix would be, on installation remove after_plugin_add hook from plugin.xml file.
    var pluginXmlFile = path.join(context.opts.projectRoot, 'plugins', 'cordova-plugin-bbd-configure', 'plugin.xml'),
        pluginXmlContent = fs.readFileSync(pluginXmlFile, 'utf-8');

    pluginXmlContent = pluginXmlContent.replace('<hook type="after_plugin_add" src="scripts/hooks/afterPluginAdd.js" />', '');
    fs.writeFileSync(pluginXmlFile, pluginXmlContent, 'utf-8');

    var cliParams,
        pluginPath = path.resolve(process.argv[4]),
        pluginsPath = path.join(pluginPath, '..'),
        configurePluginPath = path.join(pluginsPath, 'cordova-plugin-bbd-configure');

    var GeneralHelper = require(path.join(configurePluginPath, 'src', 'generalHelper.js')).GeneralHelper;
    GeneralHelper = new GeneralHelper(context, pluginsPath);

    /*
        After adding the plugin we get following cliParams:

        [ '/usr/local/bin/node',
        '/usr/local/bin/cordova',
        'plugin',
        'add',
        '../cordova-plugin-bbd-configure',
        '--variable',
        'bbdSDKForAndroid=value/bbdSDKForAndroid=""',
        '--variable',
        'bbdSDKForiOS=value/bbdSDKForiOS=""' ]

        We need to parse this
    */

    GeneralHelper.parseParams();
    cliParams = GeneralHelper.params;

    var AndroidHelper = require(path.join(configurePluginPath, 'src', 'android', 'androidHelper.js')).AndroidHelper;
    AndroidHelper = new AndroidHelper(context, GeneralHelper.basePluginPath);

    var iOSHelper = require(path.join(configurePluginPath, 'src', 'ios', 'iOSHelper.js')).iOSHelper;
    iOSHelper = new iOSHelper(GeneralHelper.basePluginPath);

    //---------------------- Restoring base plugin to initial state --------------------------------

    GeneralHelper.restoreBasePlugin();

    //--------------------- Replacing plugin.xml for Base plugin -----------------------------------

    GeneralHelper.editPluginXMLForBasePlugin();

    var platformsWithSdk = [];

    // ------------------------------ EXPLICIT MODE FOR IOS ----------------------------------------

    if (cliParams.bbdSDKForiOS) {
        GeneralHelper.setConfigurationForPlatform('ios');
        iOSHelper.handleGdIOSSDKPassedByUser(cliParams.bbdSDKForiOS);

        if (!platformsWithSdk.includes('ios')) {
            platformsWithSdk.push('ios');
        }
    }

    // ------------------------------ DEFAULT MODE FOR IOS -----------------------------------------

    if (cliParams.bbdSDKForiOS === undefined) {
        if (!GeneralHelper.isWindowsPlatform()) {
            iOSHelper.generateAutomaticPathToGdIOSSDK();
            GeneralHelper.setConfigurationForPlatform('ios');

            if (!platformsWithSdk.includes('ios')) {
                platformsWithSdk.push('ios');
            }

            console.log('\x1b[32m%s\x1b[0m', '\nTrying to generate automatic path to BlackBerry Dynamics iOS SDK...');
        }
    }

    // ----------------------------- EXPLICIT MODE FOR ANDROID -------------------------------------

    if (cliParams.bbdSDKForAndroid) {
        AndroidHelper.handleGdAndroidSDKPassedByUser(cliParams.bbdSDKForAndroid);
        GeneralHelper.setConfigurationForPlatform('android');

        if (!platformsWithSdk.includes('android')) {
            platformsWithSdk.push('android');
        }
    }

    // ------------------------------ DEFAULT MODE FOR ANDROID -------------------------------------

    if (cliParams.bbdSDKForAndroid === undefined) {
        AndroidHelper.generateAutomaticPathToGdAndroidSDK();
        GeneralHelper.setConfigurationForPlatform('android');

        if (!platformsWithSdk.includes('android')) {
            platformsWithSdk.push('android');
        }

        console.log('\x1b[32m%s\x1b[0m', '\nTrying to generate automatic path to BlackBerry Dynamics Android SDK...');
    }

    // ------------------------- HANDLE SDK CONFIGURATIONS FOR BBD-PLUGINS -------------------------

    GeneralHelper.setPlatformSdkConfigurationsInPlugins(platformsWithSdk);

    // ------------------------- OUTPUTING VALUES TO THE CONSOLE -----------------------------------

    var isGdIOSSDKSet = iOSHelper.finalGdIOSSDKPath || 'not set',
        isGdAndroidSDKSet = AndroidHelper.finalGdAndroidSDKPath || 'not set',
        idGdAssetsBundleGenerated = iOSHelper.finalGdAssetsBundlePath || 'not set';

    console.log('\x1b[32m%s\x1b[0m', '\nBlackBerry Dynamics Android SDK path: ' + isGdAndroidSDKSet + '\n');
    console.log('\x1b[32m%s\x1b[0m', 'BlackBerry Dynamics iOS SDK path: ' + isGdIOSSDKSet + '\n');
    console.log('\x1b[32m%s\x1b[0m', 'GDAssets.bundle path: ' + idGdAssetsBundleGenerated + '\n');

    // ------------------------------ CONFIGURE BASE PLUGIN ----------------------------------------

    // Coping GDAssets.bundle from external directory in Base plugin by path ‘src/ios/resources/’.
    if (fs.existsSync(iOSHelper.finalGdAssetsBundlePath)) {
        GeneralHelper.copyDirRecursively(iOSHelper.finalGdAssetsBundlePath,
            path.join(GeneralHelper.basePluginPath, 'src', 'ios', 'resources'));
    }

    // Install dependencies for Base plugin
    process.chdir(GeneralHelper.basePluginPath);
    execSync('npm install', null);

    // ---------- HANDLE PATH IN DEPENDENCIES FOR ALL BlackBerry Dynamics CORDOVA PLUGINS ----------

    // This will give us possibility to add any plugin from anywhere in the FileSystem
    GeneralHelper.handlePathInDependencyForBBDplugins();
    GeneralHelper.handlePluginPathInSampleApplication();

    process.chdir(context.opts.projectRoot);

    // ------------------------- HANDLE SDK CONFIGURATIONS FOR PROJECT BBD-PLUGINS -----------------

    var projectPluginsPath = path.join(context.opts.projectRoot, 'plugins').replace(/\s+/g, '\\ '),
        filesListCmd = GeneralHelper.isWindowsPlatform() ? 'dir ' : 'ls ',
        projectPluginsList = execSync(filesListCmd + projectPluginsPath).toString().split(osEol),
        projectFilteredBbdPluginsList = projectPluginsList.filter(function(pluginName) {
            return pluginName.includes('-plugin-bbd-') && 
                   !pluginName.includes('cordova-plugin-bbd-configure') && 
                   !pluginName.includes('cordova-plugin-bbd-base');
        });
    
    if (projectFilteredBbdPluginsList.length > 0) {
        // Reinstall all bbd-plugins on re-adding Configure plugin when other bbd-plugins are already installed
        GeneralHelper.reinstallAllBbdPluginsWithSdkConfigurations(platformsWithSdk);
        
    } else if (projectPluginsList.includes('cordova-plugin-bbd-base')) {
        // Reinstall only Base plugin on re-adding Configure plugin when no installed other bbd-plugins
        GeneralHelper.reinstallBasePluginWithSdkConfigurations();
    }
    
    process.on('exit', function() {
        execSync('cordova plugin rm cordova-plugin-bbd-configure --force');
    });
}
