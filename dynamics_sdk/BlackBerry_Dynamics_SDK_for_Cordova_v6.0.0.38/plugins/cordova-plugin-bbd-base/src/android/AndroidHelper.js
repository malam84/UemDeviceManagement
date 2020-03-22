#!/usr/bin/env node

/*
 * (c) 2018 BlackBerry Limited. All rights reserved.
 */
require('shelljs/global');

var path = require('path'),
    fs = require('fs'),
    os = require('os'),
    fse = require('fs-extra'),
    cordovaVersion,
    xml = require('cordova-common').xmlHelpers;

function cordovaVersion() {
    var version = exec("cordova -v", { silent: true });
    if (version.output) {
        return version.output;
    } else {
        return version.stdout;
    }
}

function cordovaPlugins() {
    var plugins = exec("cordova plugins", { silent: true });
    if (plugins.output) {
        return plugins.output;
    } else {
        return plugins.stdout;
    }
}

exports.cordovaPlugins = cordovaPlugins;

exports.cordovaVersion = cordovaVersion;

// ---------------------------------Plugin helper--------------------------------------
function pluginPath(plugin) {
    if (plugin.source.type == 'local')
        return plugin.source.path;

    if (plugin.source.type == 'registry')
        return plugin.source.id;

    return plugin.source.url;
}

function pluginVariables(plugin) {
    var command = '',
        pluginVariables = Object.keys(plugin.variables);

    if (pluginVariables.length === 0)
        return command;

    command += ' --variable ';
    pluginVariables.forEach(function(variable) {
        command += variable + '=\"' + plugin.variables[variable] + '\" ';
    });

    return command;
}

exports.pluginHelper = {
    getPluginPath: pluginPath,
    buildPluginVariables: pluginVariables
}

// ---------------------------------AndroidManifest helper--------------------------------------
function ManifestHelper(androidManifestPath) {
    try {
        this.path = androidManifestPath;
        this.doc = xml.parseElementtreeSync(this.path);
    } catch (e) {
        console.log('Parsing ' + this.path + ' faild');
        throw e;
    }
}

ManifestHelper.prototype = {
    destroyAttribute: function(attrObject) {
        if (attrObject.constructor.name !== 'Function' && this.doc.getroot().find(attrObject.location).attrib[attrObject.attrName])
            delete this.doc.getroot().find(attrObject.location).attrib[attrObject.attrName];
    },
    setAttribute: function(attrObject) {
        if (attrObject.constructor.name !== 'Function')
            this.doc.getroot().find(attrObject.location).attrib[attrObject.attrName] = attrObject.value;
    },
    writeSync: function() {
        fs.writeFileSync(this.path, this.doc.write({ indent: 4 }), 'utf-8');
    },
    chmodSync: function(modNumber) {
        fs.chmodSync(this.path, modNumber);
    },
    getAttribute: function(attr) {
        return this.doc.getroot().attrib[attr];
    },
    packageName: function() {
        return this.doc.getroot().attrib.package;
    }
}

exports.ManifestHelper = ManifestHelper;

// ---------------------------------config xml helper--------------------------------------
function ConfigHelper(configXMLPath) {
    var ConfigParser = require('cordova-common').ConfigParser;

    try {
        this.path = configXMLPath;
        this.doc = xml.parseElementtreeSync(configXMLPath);
        this.configXmlObj = new ConfigParser(configXMLPath);
    } catch (e) {
        console.log('Parsing ' + configXMLPath + ' faild');
        throw e;
    }
}

ConfigHelper.prototype = {
    writeSync: ManifestHelper.prototype.writeSync.bind(this),
    setAttribute: function(attrObj) {
        ManifestHelper.prototype.setAttribute.call(this, attrObj);
    },
    destroyAttr: function(attrObj) {
        ManifestHelper.prototype.destroyAttr.call(this, attrObj);
    },
    isCustomIconSet: function() {
        if (this.configXmlObj.getIcons('android').length > 0 || this.configXmlObj.doc.getroot().find('icon')) {
            return true;
        } else {
            return false;
        }
    }
}

exports.ConfigHelper = ConfigHelper;

// -------------------------------project properties helper---------------------------------
function PropertiesHelper(propertiesPath) {
    try {
        this.path = propertiesPath;
        this.doc = fs.readFileSync(propertiesPath, 'utf-8');
    } catch (e) {
        console.log('Processing ' + propertiesPath + ' faild');
        throw e;
    }

    this.settingsStrings = filterComment(this.doc);
    this.comments = this.settingsStrings.comments;
    this.objProperties = parseProjectProperties(this.settingsStrings.properties, '=');
    this.androidLibraries = Object.keys(this.objProperties).filter(isAndroidLibraryReference)
    this.androidLibraryCount = this.androidLibraries.length + 1;
}

// ---------------------------------Properties helper--------------------------------------
PropertiesHelper.prototype = {
    addProperty: function(prop, value) {
        this.objProperties[prop] = value;
    },
    destroyProperty: function(prop) {
        delete this.objProperties[prop];
    },
    isBBDConfigured: function() {
        return this.isGDPropertySet('GDLibrary') && this.isGDPropertySet('GDLibrary_BackupSupport');
    },
    isGDPropertySet: function(property) {
        for (string in this.androidLibraries) {
            var key = this.androidLibraries[string];
            if (this.objProperties[key] == property)
                return true;
        }
        return false;
    },
    editProperties: function() {
        if (this.isBBDConfigured())
            return;
        if (!this.isGDPropertySet('GDLibrary')) {
            this.addProperty('android.library.reference.' + this.androidLibraryCount, 'GDLibrary');
            this.androidLibraryCount++;
        }
        if (!this.isGDPropertySet('GDLibrary_BackupSupport'))
            this.addProperty('android.library.reference.' + this.androidLibraryCount, 'GDLibrary_BackupSupport');

        this.writeSync();
    },
    restoreProperties: function() {
        var objKeys = Object.keys(this.objProperties);
        for (key in objKeys)
            if (this.objProperties[objKeys[key]] === 'GDLibrary' || this.objProperties[objKeys[key]] === 'GDLibrary_BackupSupport')
                this.destroyProperty(objKeys[key]);

        this.writeSync();
    },
    buildSettings: function() {
        var propertiesStream = '',
            comments = this.comments,
            propertiesKeys = Object.keys(this.objProperties);
        for (comment in comments)
            propertiesStream += comments[comment] + os.EOL;

        for (key in propertiesKeys)
            propertiesStream += propertiesKeys[key] + '=' + this.objProperties[propertiesKeys[key]] + os.EOL;

        return propertiesStream;
    },
    writeSync: function() {
        fs.writeFileSync(this.path, this.buildSettings(), 'utf-8');
    },
    chmodSync: function(modNumber) {
        fs.chmodSync(this.path, modNumber);
    }
}

exports.PropertiesHelper = PropertiesHelper;

function filterComment(projectPropertiesStream) {
    var propertiesAll = projectPropertiesStream.split(os.EOL),
        projComments = propertiesAll.filter(isComment),
        projProperties = propertiesAll.filter(isProperty),

        propertiesObj = {};
    propertiesObj.comments = projComments;
    propertiesObj.properties = projProperties;

    return propertiesObj;
}

function isComment(str) {
    return str[0] === '#' || str[0] === '//';
}

function isProperty(str) {
    return str[0] !== '#' && str.length > 3;
}

function isAndroidLibraryReference(key) {
    return key.includes('android.library.reference');
}

function parseProjectProperties(settingsStrings, ident) {

    var keyValuyPairProperties = [];

    for (var property in settingsStrings)
        keyValuyPairProperties.push(settingsStrings[property].split(ident));

    var propertiesObj = {};

    for (prop in keyValuyPairProperties) {
        var key = keyValuyPairProperties[prop][0],
            value = keyValuyPairProperties[prop][1];

        propertiesObj[key] = value;
    }

    return propertiesObj;
}

// ---------------------------------Settings Gradle helper--------------------------------------
function SettingsGradleHelper(settingsGradlePath) {
    try {
        this.path = settingsGradlePath;
        this.doc = fs.readFileSync(settingsGradlePath, 'utf-8');
    } catch (e) {
        console.log('Processing ' + settingsGradlePath + ' faild');
        throw e;
    }
    this.settingsStrings = this.doc.split(os.EOL);
    this.bbdSettings = [':GDLibrary', ':GDLibrary_BackupSupport'];
}

SettingsGradleHelper.prototype = {
    setSetting: function(setting) {
        if (!this.isGDPropertySet('include "' + setting + '"'))
            this.settingsStrings.push('include "' + setting + '"');
    },
    isGDPropertySet: function(setting) {
        for (propString in this.settingsStrings) {
            if (this.settingsStrings[propString].includes(setting))
                return true;
        }
        return false;
    },
    destroySetting: function(setting) {
        for (prop in this.settingsStrings)
            if (this.settingsStrings[prop].includes(setting))
                this.settingsStrings.splice(prop, 1);
    },
    buildSettings: function() {
        cleanEmptyStrings(this.settingsStrings);

        return this.settingsStrings.join(os.EOL);
    },
    editSettings: function() {
        for (setting in this.bbdSettings)
            this.setSetting(this.bbdSettings[setting]);

        this.writeSync();
    },
    restoreSettings: function() {
        for (setting in this.bbdSettings)
            this.destroySetting(this.bbdSettings[setting]);

        this.writeSync();
    },
    writeSync: function() {
        fs.writeFileSync(this.path, this.buildSettings(), 'utf-8');
    },
    chmodSync: function(modNumber) {
        fs.chmodSync(this.path, modNumber);
    }
}

function cleanEmptyStrings(stringsArray) {
    for (string in stringsArray)
        if (stringsArray[string].length < 3)
            stringsArray.splice(string, 1);
}

exports.SettingsGradleHelper = SettingsGradleHelper;

function CommonHelper(filePath) {
    try {
        this.path = filePath;
        this.doc = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        console.log('Processing ' + filePath + ' faild');
        throw e;
    }
}

// ---------------------------------Common helper--------------------------------------
CommonHelper.prototype = {
    writeSync: function() {
        fs.writeFileSync(this.path, this.doc, 'utf-8');
    },
    replaceStringsGlobal: function(dist, target) {
        dist = new RegExp(dist, 'g');

        this.doc = this.doc.replace(dist, target);
    },
    replaceStringsGlobalMultiple: function(dist, target) {
        dist = new RegExp(dist, 'gm');

        this.doc = this.doc.replace(dist, target);
    },
    chmodSync: function(modNumber) {
        fs.chmodSync(this.path, modNumber);
    }
}

exports.CommonHelper = CommonHelper;

// ---------------------------------Settings.json helper--------------------------------------

function SettingsJsonHelper(context) {
    // create alternative settings.json location for cordova@8.0.0
    var platformRoot = path.join(context.opts.projectRoot, 'platforms', 'android'),
        cordovaSevenLocation = path.join(platformRoot, 'assets', 'settings.json'),
        alternativeLocation = path.join(platformRoot, 'app', 'src', 'main', 'assets', 'settings.json'),
        isCordovaSevenLocationExists = fs.existsSync(cordovaSevenLocation);

    try {
        this.androidSettingsJsonPath = isCordovaSevenLocationExists ? cordovaSevenLocation : alternativeLocation;
        this.settingsJsonObj = this.settingsJsonToObject();
    } catch (e) {
        throw e;
    }
}

SettingsJsonHelper.prototype = {
    settingsJsonToObject: function() {
        var settingsJson = fs.readFileSync(this.androidSettingsJsonPath, { encoding: 'utf8' });
        return JSON.parse(settingsJson);
    },
    addProperty: function(prop, value) {
        this.settingsJsonObj[prop] = value;
    },
    removeProperty: function(prop) {
        delete this.settingsJsonObj[prop];
    },
    writeSync: function() {
        fs.writeFileSync(this.androidSettingsJsonPath, JSON.stringify(this.settingsJsonObj, null, 4), { encoding: 'utf8' });
    },
    chmodSync: function(modNumber) {
        fs.chmodSync(this.androidSettingsJsonPath, modNumber);
    }
}

exports.SettingsJsonHelper = SettingsJsonHelper;


function GeneralHelper(context) {
    this.context = context;
}

GeneralHelper.prototype = {
    prepareResourceFolders: function(foldersArr) {
        var platformRoot = path.join(this.context.opts.projectRoot, 'platforms', 'android'),
            resourcesFolder = path.join(platformRoot, 'res'),
            resXmlFolder = path.join(resourcesFolder, 'xml');

        if (!fs.existsSync(resXmlFolder)) {
            resourcesFolder = path.join(platformRoot, 'app', 'src', 'main', 'res');
        }

        foldersArr.forEach(function(folderName) {
            fse.ensureDir(path.join(resourcesFolder, folderName));
        })
    }
}

exports.GeneralHelper = GeneralHelper;
