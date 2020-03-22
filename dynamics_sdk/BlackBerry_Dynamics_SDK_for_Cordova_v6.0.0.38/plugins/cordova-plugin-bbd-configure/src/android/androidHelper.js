#!/usr/bin/env node

/*
 * (c) 2019 BlackBerry Limited. All rights reserved.
 */

var path = require('path'),
    fs = require('fs'),
    execSync = require('child_process').execSync,
    os = require('os');

function AndroidHelper(context, basePluginPath) {
    try {
        this.shellJS = context.requireCordovaModule('shelljs');
        this.basePluginPath = basePluginPath;
        this.gradlePropertiesPath = path.join(basePluginPath, 'scripts', 'gradle', 'gradle.properties');
        this.finalGdAndroidSDKPath;
    } catch (e) {
        throw e;
    }
}

AndroidHelper.prototype = {

    handleGdAndroidSDKPassedByUser: function(bbdSDKForAndroid) {
        // validate the values if they suppose to be correct
        // we do not need the path to be escaped as Node handles it itself

        bbdSDKForAndroid = bbdSDKForAndroid.replace(/\\ /g, ' ');

        // execSync transforms ‘~’ to full path for different cases.
        // Regular expression here is for removing \n or \r that are in the end of string returned
        // by execSync it supports following cases:
        // ~username1/...
        // ~username2/...
        // ~/...
        bbdSDKForAndroid = execSync('echo ' + bbdSDKForAndroid, { encoding: 'utf-8' }).replace(/[\r\n]/g, '');

        var m2Path;
        if (path.basename(bbdSDKForAndroid) == 'm2repository') {
            m2Path = bbdSDKForAndroid;
        } else {
            m2Path = path.join(bbdSDKForAndroid, '..', 'm2repository')
        }

        if (fs.existsSync(m2Path)) {
            this.updateGradlePropertiesWithM2Path(m2Path);
            this.finalGdAndroidSDKPath = m2Path;
        } else {
            throw new Error("BlackBerry Dynamics Android SDK is not available at path you passed: " +
                bbdSDKForAndroid + ". Please enter correct path.");
        }
    },
    generateAutomaticPathToGdAndroidSDK: function() {
        var androidHome;

        // check if ANDROID_HOME is set
        if (!process.env.ANDROID_HOME) {
            throw new Error("ANDROID_HOME environment variable is not set");
        } else {
            androidHome = process.env.ANDROID_HOME;
            console.log('\x1b[32m%s\x1b[0m', '\nANDROID_HOME path: ' + androidHome);
        }

        var m2path = path.join(androidHome, 'extras', 'blackberry', 'dynamics_sdk', 'm2repository');

        if (fs.existsSync(m2path)) {
            this.finalGdAndroidSDKPath = m2path;
        } else {
            throw new Error('BlackBerry Dynamics Android SDK is not available at the following path: \n' +
                '\t"' + m2path + '"\n');
        }
    },
    updateGradlePropertiesWithM2Path: function(value) {
        var content = fs.readFileSync(this.gradlePropertiesPath, 'utf-8');
        if (content.includes('bbdSdkPath')) {
            content = content.split(os.EOL).filter(function(line) {
                return !line.includes('bbdSdkPath')
            }).join(os.EOL);
        }

        if (process.platform == 'win32') {
            value = value.split('\\').join('\\\\');
        }

        content += os.EOL + 'bbdSdkPath=' + value;

        fs.writeFileSync(this.gradlePropertiesPath, content, 'utf-8');
    }
}

exports.AndroidHelper = AndroidHelper;
