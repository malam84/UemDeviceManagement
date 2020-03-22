#!/usr/bin/env node

/*
 * (c) 2019 BlackBerry Limited. All rights reserved.
 */

var path = require('path'),
    fs = require('fs'),
    execSync = require('child_process').execSync,
    os = require('os'),
    readline = require('readline');

function GeneralHelper(context, pluginsPath) {

    try {
        this.params = {};
        this.pluginsPath = pluginsPath;
        this.sampleAppsPath = path.join(this.pluginsPath, '..', 'SampleApplications');
        this.shellJS = context.requireCordovaModule('shelljs');
        this.projectRoot = context.opts.projectRoot;

        console.log('\x1b[32m%s\x1b[0m', '\nOperating system platform: ' + process.platform);
    } catch (e) {
        throw e;
    }

    this.bbdCordovaPlugins = [
        'cordova-plugin-bbd-all',
        'cordova-plugin-bbd-analytics',
        'cordova-plugin-bbd-appkinetics',
        'cordova-plugin-bbd-application',
        'cordova-plugin-bbd-filetransfer',
        'cordova-plugin-bbd-httprequest',
        'cordova-plugin-bbd-interappcommunication',
        'cordova-plugin-bbd-push',
        'cordova-plugin-bbd-launcher',
        'cordova-plugin-bbd-mailto',
        'cordova-plugin-bbd-serversideservices',
        'cordova-plugin-bbd-socket',
        'cordova-plugin-bbd-specificpolicies',
        'cordova-plugin-bbd-sqlite',
        'cordova-plugin-bbd-storage',
        'cordova-plugin-bbd-tokenhelper',
        'cordova-plugin-bbd-xmlhttprequest'
    ];
}

GeneralHelper.prototype = {
    isWindowsPlatform: function() {
        return process.platform == 'win32';
    },
    parseParams: function() {

        // access to path to the plugin
        this.params["pathToPlugin"] = process.argv[4];

        // starting at index 5 according to above output
        for (var i = 5; i < process.argv.length; i++) {
            // we do not need '--variable'
            if (process.argv[i] !== '--variable') {
                var key = process.argv[i].substring(0, process.argv[i].indexOf('='));
                var value = process.argv[i].substring(process.argv[i].indexOf('=') + 1, process.argv[i].length);
                this.params[key] = value;
            }
        }

        this.basePluginPath = path.join(this.pluginsPath, 'cordova-plugin-bbd-base');
        this.basePluginXml = path.join(this.basePluginPath, 'plugin.xml');
        console.log('\x1b[32m%s\x1b[0m', '\nPath to BlackBerry Dynamics Cordova plugins folder: ' + this.pluginsPath);

    },
    updateDependenciesForPlugin: function(pathToPlugin) {
        var pluginXmlPath = path.join(pathToPlugin, 'plugin.xml'),
            pluginXmlData = fs.readFileSync(pluginXmlPath, 'utf8');

        fs.chmodSync(pluginXmlPath, '660');

        if (pluginXmlData.indexOf('../cordova-plugin-bbd-base') >= 0) {
            pluginXmlData = pluginXmlData.replace(/url="../g, 'url="' + this.pluginsPath);
            fs.writeFileSync(pluginXmlPath, pluginXmlData, 'utf8');
        }
    },
    setPlatformSdkConfigurationsInPlugins: function(platformsWithSdk) {

        // update bbd-plugins with platform specific SDK configurations
        for (var i = 0; i < this.bbdCordovaPlugins.length; i++) {

            if (this.bbdCordovaPlugins[i] !== 'cordova-plugin-bbd-all') {

                var pathToPluginFolder = path.join(this.pluginsPath, this.bbdCordovaPlugins[i]),
                    pathToPluginXml = path.join(pathToPluginFolder, 'plugin.xml'),
                    pathToPluginXmlTemplateWithoutConfigurations = path.join(
                        pathToPluginFolder, 'src', 'pluginXMLNoPlatformConfigurations.xml'
                    ),
                    pathToiOSConfigurationForPluginXml = path.join(
                        pathToPluginFolder, 'src', 'iOSConfigurationForPluginXML.txt'
                    ),
                    pathToAndroidConfigurationForPluginXml = path.join(
                        pathToPluginFolder, 'src', 'androidConfigurationForPluginXML.txt'
                    ),
                    pluginXmlTemplateData = fs.readFileSync(pathToPluginXmlTemplateWithoutConfigurations, 'utf8');

                if (platformsWithSdk.includes('ios')) {
                    pluginXmlTemplateData = pluginXmlTemplateData.replace('<!-- iOS -->', 
                        fs.readFileSync(pathToiOSConfigurationForPluginXml, 'utf8'));
                }

                if (platformsWithSdk.includes('android')) {
                    pluginXmlTemplateData = pluginXmlTemplateData.replace('<!-- Android -->', 
                        fs.readFileSync(pathToAndroidConfigurationForPluginXml, 'utf8'));
                }

                fs.writeFileSync(pathToPluginXml, pluginXmlTemplateData, 'utf8');

            }
            
        }

    },
    reinstallAllBbdPluginsWithSdkConfigurations: function(platforms) {
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log(
            'BlackBerry Dynamics Cordova Configure plugin was just re-added with different configuration than before.\n' +
            'Do you want to upgrade BlackBerry Dynamics Cordova plugins using this configuration?\n' +
            'If "yes", plugins will be upgraded in both "<path_to_package>/BlackBerry_Dynamics_SDK_for_Cordova_<version>/plugins/" ' +
            'and "<current_applicaton>/plugins/".\n' +
            'If "no", plugins will be upgraded only in "<path_to_package>/BlackBerry_Dynamics_SDK_for_Cordova_<version>/plugins/" ' +
            'and you will need to re-install them into your application manually. (y/n)?'
        );
        // y - reinstall all plugins + Base; n - reinstall nothing and give instructions
        rl.on('line', function(input) {
            switch (input.trim()) {
                case 'y':
                    this.updatePlatformConfigurationsForBbdPlugins();
                    rl.close();
                    break;
                case 'n':
                    console.log(
                        'BlackBerry Dynamics Cordova plugins were upgraded with new configuration in ' +
                        '"<path_to_package>/BlackBerry_Dynamics_SDK_for_Cordova_<version>/plugins/".\n' +
                        'If you want to use upgraded plugins in your Cordova application please re-add them manually ' +
                        'using following approach: \n' +
                        '- $ cordova plugin rm <plugin> --force\n' +
                        '- $ cordova plugin add <plugin>\n' +
                        'Please note that "cordova-plugin-bbd-base" should be re-added as the last turn.'
                    );
                    rl.close();
                    break;
                default:
                    console.log('Please, enter (y/n) to continue...');
                    break;
            }
        }.bind(this));

    },
    updatePlatformConfigurationsForBbdPlugins: function() {
        console.log('Updating BlackBerry Dynamics Cordova plugins with new configuration.');

        var packageJson = require(path.join(this.projectRoot, 'package.json')),
            installedPlugins = packageJson.dependencies,
            removedBbdPLugins = [],
            basePluginPath;

        // ---------- Remove installed bbd-plugins ----------

        for (pluginName in installedPlugins) {
            if (pluginName.includes('-plugin-bbd-') && 
                !pluginName.includes('configure') && 
                !pluginName.includes('base')) {
                console.log('Removing "' + pluginName + '"');
                execSync('cordova plugin rm ' + pluginName + ' --force');
                removedBbdPLugins.push(pluginName);
            }
        }

        // ---------- Reinstall/Install base-plugin ----------

        if (installedPlugins["cordova-plugin-bbd-base"]) {
            basePluginPath = installedPlugins["cordova-plugin-bbd-base"].replace('file:', '');
            console.log('Removing "cordova-plugin-bbd-base"');
            execSync('cordova plugin rm cordova-plugin-bbd-base --force');
        }
        console.log('Installing "cordova-plugin-bbd-base"');
        execSync('cordova plugin add ' + basePluginPath);

        // ---------- Install back all removed before bbd-plugins ----------

        for (var i = 0; i < removedBbdPLugins.length; i++) {
            console.log('Installing "' + removedBbdPLugins[i] + '"');
            execSync('cordova plugin add ' + installedPlugins[removedBbdPLugins[i]].replace('file:', ''));
        }

    },
    reinstallBasePluginWithSdkConfigurations: function() {
        console.log('Reinstalling "cordova-plugin-bbd-base"');

        var packageJson = require(path.join(this.projectRoot, 'package.json')),
            installedPlugins = packageJson.dependencies,
            basePluginPath = installedPlugins["cordova-plugin-bbd-base"].replace('file:', '');

        // ---------- Reinstall base-plugin ----------

        execSync('cordova plugin rm cordova-plugin-bbd-base --force');
        execSync('cordova plugin add ' + basePluginPath);

    },
    setConfigurationForPlatform: function(platform) {
        var configData,
            basePluginXmlData = fs.readFileSync(this.basePluginXml, 'utf8'),
            pathToAndroidConfiguration = path.join(
                this.pluginsPath, 'cordova-plugin-bbd-configure', 'src', 'android', 'androidConfigurationForPluginXML.txt'
            ),
            pathToiOSConfiguration = path.join(
                this.pluginsPath, 'cordova-plugin-bbd-configure', 'src', 'ios', 'iOSConfigurationForPluginXML.txt'
            );

        fs.chmodSync(this.basePluginXml, '660');

        if (platform === 'ios') {
            configData = fs.readFileSync(pathToiOSConfiguration, 'utf8');
            basePluginXmlData = basePluginXmlData.replace('<!-- iOS -->', configData);
        } else if (platform === 'android') {
            configData = fs.readFileSync(pathToAndroidConfiguration, 'utf8');
            basePluginXmlData = basePluginXmlData.replace('<!-- Android -->', configData);
        }

        fs.writeFileSync(this.basePluginXml, basePluginXmlData, 'utf8');

    },
    handlePathInDependencyForBBDplugins: function() {
        for (var plugin = 0; plugin < this.bbdCordovaPlugins.length; plugin++) {
            var currentPlugin = this.bbdCordovaPlugins[plugin],
                pathToCurrentPlugin = path.join(this.pluginsPath, currentPlugin);

            this.updateDependenciesForPlugin(pathToCurrentPlugin);
        };
    },
    handlePluginPathInSampleApplication: function() {

        var sampleAppsPath = this.sampleAppsPath,
            pluginsPath = this.pluginsPath;

        fs.readdirSync(sampleAppsPath).forEach(function(dir) {
            var pathToSampleApp = path.join(sampleAppsPath, dir),
                configXmlPath = path.join(pathToSampleApp, 'config.xml'),
                configXmlData;

            if (fs.existsSync(configXmlPath)) {
                configXmlData = fs.readFileSync(configXmlPath, 'utf8')
                configXmlData = configXmlData.split('../../plugins/cordova-plugin-bbd-').join(pluginsPath +
                    '/cordova-plugin-bbd-');
                fs.writeFileSync(configXmlPath, configXmlData, 'utf8');
            }

        });
    },
    copyDirRecursively: function(sourceFolder, targetFolder) {
        this.shellJS.cp('-R', sourceFolder, targetFolder);
        fs.chmodSync(targetFolder, '755');
    },
    restoreBasePlugin: function() {
        var removeDirCmd = this.isWindowsPlatform() ? "rmdir /s /q " : "rm -rf ",
            gradlePropertiesPath = path.join(this.basePluginPath, 'scripts', 'gradle', 'gradle.properties'),
            gradlePropertiesContent = fs.readFileSync(gradlePropertiesPath, 'utf-8');

        gradlePropertiesContent = gradlePropertiesContent.split(os.EOL).filter(function(line) {
            return !line.includes('bbdSdkPath') && !line.includes('bbdDefaultSdkAddition');
        }).join(os.EOL);

        fs.writeFileSync(gradlePropertiesPath, gradlePropertiesContent, 'utf-8');

        if (fs.existsSync(path.join(this.basePluginPath, 'src', 'ios', 'resources', 'GDAssets.bundle'))) {
            execSync(removeDirCmd + '"' + path.join(this.basePluginPath, 'src', 'ios', 'resources', 'GDAssets.bundle') + '"');
        }
    },
    editPluginXMLForBasePlugin: function() {
        if (fs.existsSync(this.basePluginXml)) {
            fs.unlinkSync(this.basePluginXml);
        }

        this.shellJS.cp('-Rf', path.join(
            this.pluginsPath, 'cordova-plugin-bbd-configure', 'src', 'originalPluginXMLForBasePlugin.xml'), this.basePluginPath
        );
        this.shellJS.mv(path.join(this.basePluginPath, 'originalPluginXMLForBasePlugin.xml'), this.basePluginXml);
    }
}

exports.GeneralHelper = GeneralHelper;
