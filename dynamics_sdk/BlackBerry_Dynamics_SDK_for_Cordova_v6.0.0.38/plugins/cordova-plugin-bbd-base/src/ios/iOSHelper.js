#!/usr/bin/env node

/*
 * (c) 2018 BlackBerry Limited. All rights reserved.
 */

var path = require('path'),
    fs = require('fs'),
    plist = require('plist'),
    ConfigParser = require('cordova-common').ConfigParser;

function parseCliInput(inputStr) {
    /*
        After adding the plugin we get following params:

        [ '/usr/local/bin/node',
        '/usr/local/bin/cordova',
        'plugin',
        'add',
        '<path_to_plugins>/cordova-plugin-bbd-base',
        '--variable',
        'name=value']

        We need to parse this
    */

    var inputArr = inputStr.split(' '),
        cliParams = {};

    // starting at index 5 according to above output
    for (var i = 5; i < inputArr.length; i++) {
        // we do not need '--variable'
        if (inputArr[i] !== '--variable' && inputArr[i].indexOf('=') >= 0) {
            // here we have key=value pair
            var keyValueArr = inputArr[i].split('=');
            cliParams[keyValueArr[0]] = keyValueArr[1];
        }
    }

    return cliParams;
}

function readBBDFaceIDUsageDescriptionMgs(context) {
    // read file cordova-plugin-bbd-base/src/iOS/resources/Localization/en.lproj/InfoPlist.strings
    // to get value for 'NSFaceIDUsageDescription' property
    var enLprojPath = path.join(context.opts.projectRoot, 'plugins', 'cordova-plugin-bbd-base',
            'src', 'ios', 'resources', 'Localization', 'en.lproj', 'InfoPlist.strings'),
        enLprojData = fs.readFileSync(enLprojPath, 'utf8'),
        faceIDKey = '"NSFaceIDUsageDescription"',
        faceIDValue = enLprojData.split('\n')
            .filter(function(el) {
                // get array of one element containing line with key=value pair we need
                return el.indexOf(faceIDKey) >= 0;
            })[0].split('=').filter(function(el) {
                // get array of one element containing value we need
                return el.indexOf(faceIDKey) < 0;
            })[0].trim().slice(1, -2); // remove spaces, removed first '"' and last '";' from string

    return faceIDValue;
}

if (Array.prototype.includes === undefined) {
    Array.prototype.includes = function(value) {
        return this.filter(function(arrEntry) {
            return arrEntry === value;
        }).length > 0;
    }
}

function PlistHelper(context) {
    try {
        this.bbdFaceIDUsageDescriptionMgs = readBBDFaceIDUsageDescriptionMgs(context);
        this.platformRoot = path.join(context.opts.projectRoot, 'platforms', 'ios');
        this.projectName = new ConfigParser(path.join(context.opts.projectRoot,
            'config.xml')).name();
        this.platformFiles = fs.readdirSync(this.platformRoot);
        this.originalNameOfiOSProject = this.getOriginalNameOfiOSProject();
        this.plistFilePath = path.join(this.platformRoot, this.originalNameOfiOSProject,
            this.originalNameOfiOSProject + "-Info.plist");
        this.plistObj = this.convertPlistToObj(this.plistFilePath);
        this.entitlementPlistFilePath = path.join(this.platformRoot, this.originalNameOfiOSProject,
            "Resources", "Entitlements.plist");
        this.entitlementPlistObj = this.convertPlistToObj(this.entitlementPlistFilePath);
        this.packageName = new ConfigParser(path.join(context.opts.projectRoot,
            'config.xml')).packageName();
    } catch (e) {
        throw e;
    }
}

PlistHelper.prototype = {
    getOriginalNameOfiOSProject: function() {
        var contentOfiOSFolder = fs.readdirSync(this.platformRoot),
            newArr = contentOfiOSFolder.filter(function(el) {
                return el.indexOf('.xcodeproj') > -1;
            });

        return newArr[0].substring(0, newArr[0].indexOf('.xcodeproj'));
    },
    preparePlist: function() {
        // 'plist' module removes empty string tags '<string></string>' or '<string/>'
        // for optimization and plist becomes invalid after calling build() method.
        // To hack this behaviour we can just replace these empty tags with unique occupier string
        // like '<string>s6metpq4mjomd0f3whfr</string>'.
        // We will randomly generate this occupier string with 20 characters of size
        // It will not affect anything, we will revert our changes after building plist file
        // from JS object below.
        var uniqueOccupier = this.generateUniqueOccupierFor();
        var plistData = fs.readFileSync(this.plistFilePath, 'utf8');
        plistData = plistData.replace(/<string\/>/g, '<string><\/string>');
        plistData = plistData.replace(/<string><\/string>/g, '<string>' + uniqueOccupier + '<\/string>');
        fs.writeFileSync(this.plistFilePath, plistData, { encoding: 'utf8' });
    },
    generateUniqueOccupierFor: function() {
        return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    },
    removeItem: function(array, item) {
        for (var i in array) {
            if (array[i] == item) {
                array.splice(i, 1);
                break;
            }
        }
    },
    convertPlistToObj: function() {
        if (fs.existsSync(this.plistFilePath)) {
            this.preparePlist();
            return plist.parse(fs.readFileSync(this.plistFilePath, 'utf8'));
        } else {
            throw new Error("The file \"" + this.plistFilePath + "\" dosen\'t exists");
        }
    },
    editPlist: function() {

        if (!this.plistObj.GDApplicationID || this.plistObj.GDApplicationID.length == 0)
            this.plistObj.GDApplicationID = this.packageName;

        if (!this.plistObj.GDApplicationVersion || this.plistObj.GDApplicationVersion.length == 0)
            this.plistObj.GDApplicationVersion = '1.0.0.0';

        if (this.plistObj.CFBundleURLTypes === undefined) {
            this.plistObj.CFBundleURLTypes = [{
                CFBundleURLSchemes: []
            }];
        }

        this.plistObj.CFBundleURLTypes[0].CFBundleURLName = this.packageName;

        if (!this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.includes(this.packageName + '.sc2.1.0.0.0'))
            this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.push(this.packageName + '.sc2.1.0.0.0');

        if (!this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.includes(this.packageName + '.sc2'))
            this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.push(this.packageName + '.sc2');

        // N-series iOS apps now must define .sc3 URL scheme such that the AppKinetics Bridge can discover them
        if (!this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.includes(this.packageName + '.sc3.1.0.0.0'))
            this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.push(this.packageName + '.sc3.1.0.0.0');

        if (!this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.includes(this.packageName + '.sc3'))
            this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.push(this.packageName + '.sc3');

        if (!this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.includes('com.good.gd.discovery'))
            this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.push('com.good.gd.discovery');

        // Removing NSMainNibFile from *.plist that does not exist in Cordova app and causes runtime crash
        if (this.plistObj.NSMainNibFile || this.plistObj.NSMainNibFile === null)
            this.removeProperty("NSMainNibFile");

        if (this.plistObj["NSMainNibFile~ipad"] || this.plistObj["NSMainNibFile~ipad"] === null)
            this.removeProperty("NSMainNibFile~ipad");

        this.writeSync();

    },
    editEntitlementPlist: function() {
        fs.chmodSync(this.entitlementPlistFilePath, '660');
        this.entitlementPlistObj['application-identifier'] = this.packageName;
        fs.writeFileSync(this.entitlementPlistFilePath,
            plist.build(this.entitlementPlistObj), { encoding: 'utf8' });
    },
    addUrlScheme: function(value) {
        if (this.plistObj.CFBundleURLTypes === undefined) {
            this.plistObj.CFBundleURLTypes = [{
                CFBundleURLSchemes: []
            }];
        }
        if (!this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.includes(value))
            this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes.push(value);
    },
    removeUrlScheme: function(schemeName) {
        if (this.plistObj.CFBundleURLTypes[0]) {
            this.plistObj.CFBundleURLTypes[0].CFBundleURLSchemes = this.plistObj
                .CFBundleURLTypes[0].CFBundleURLSchemes.filter(function(value) {
                    return value != schemeName;
                })
        }
    },
    addProperty: function(prop, value) {
        this.plistObj[prop] = value;
    },
    removeProperty: function(prop) {
        delete this.plistObj[prop];
    },
    writeSync: function() {
        fs.writeFileSync(this.plistFilePath, plist.build(this.plistObj), { encoding: 'utf8' });
    }
}

exports.PlistHelper = PlistHelper;

// -----------------------------  Helper for xcconfig  -----------------------------

function XcconfigHelper(context) {
    try {
        this.context = context;
        this.defaultXcconfigPath = path.join(this.context.opts.projectRoot,
            'plugins', 'cordova-plugin-bbd-base', 'src', 'ios', 'default.xcconfig');
        this.cordovaBuildXcconfigPath = path.join(this.context.opts.projectRoot,
            'platforms', 'ios', 'cordova', 'build.xcconfig');
        this.defaultXcconfigContent = fs.readFileSync(this.defaultXcconfigPath, { encoding: 'utf8' });
        this.cordovaBuildXcconfigContent = fs.readFileSync(this.cordovaBuildXcconfigPath, { encoding: 'utf8' });
    } catch (e) {
        throw e;
    }
}

XcconfigHelper.prototype = {
    editXcconfig: function() {
        fs.chmodSync(this.defaultXcconfigPath, '660');

        // fixed bug with provision on ios 11 simulators
        if (this.cordovaBuildXcconfigContent.indexOf('CODE_SIGN_ENTITLEMENTS') > 0) {
            this.cordovaBuildXcconfigContent = this.cordovaBuildXcconfigContent
                .replace('CODE_SIGN_ENTITLEMENTS', '// CODE_SIGN_ENTITLEMENTS');
            fs.writeFileSync(this.cordovaBuildXcconfigPath, this.cordovaBuildXcconfigContent, 'utf8');
        }

        if (fs.existsSync(this.defaultXcconfigPath)) {
            var comment = '// Build configuration for BlackBerry Dynamics SDK for iOS. Please do not remove it!!!',
                contentForAdding = this.defaultXcconfigContent
                    .slice(this.defaultXcconfigContent.indexOf(comment) - 2);

            fs.appendFileSync(this.cordovaBuildXcconfigPath, contentForAdding);
        } else {
            throw new Error("Wrong path to default.xcconfig file.");
        }
    },
    removeLineInXcconfig: function(pathTofileForRestore, contentForRemove) {
        var cordovaXcconfigContent = fs.readFileSync(pathTofileForRestore, { encoding: 'utf8' }),
            noGDStuff = cordovaXcconfigContent.replace(contentForRemove, '');

        fs.writeFileSync(pathTofileForRestore, noGDStuff, 'utf8');
    }
}

exports.XcconfigHelper = XcconfigHelper;
