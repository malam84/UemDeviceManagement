#!/usr/bin/env node

/*
 * (c) 2018 BlackBerry Limited. All rights reserved.
 */

// Restore GDEnterpriseSimulationMode for iOS and Android platforms
module.exports = function(context) {

    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        configXmlPath = path.join(context.opts.projectRoot, 'config.xml'),
        ConfigParser = require('cordova-common').ConfigParser,
        configXmlObj = new ConfigParser(configXmlPath);

    // Remove BBD preferences from config.xml
    var preferenceForRemove = [
        'GDEnterpriseSimulationMode',
        'GDApplicationID',
        'GDApplicationVersion',
        'BBD_Enterprise_Discovery',
        'addFaceIDUsage'
    ];

    // global preference
    for (var i = 0; i < preferenceForRemove.length; i++) {
        if (configXmlObj.getGlobalPreference(preferenceForRemove[i])) {
            removeGlobalPreference(preferenceForRemove[i]);
        }
    }

    // ios preference
    for (var i = 0; i < preferenceForRemove.length; i++) {
        if (configXmlObj.getPreference(preferenceForRemove[i], 'ios')) {
            removePreferenceInPlatform(preferenceForRemove[i], 'ios');
        }
    }

    // android preference
    for (var i = 0; i < preferenceForRemove.length; i++) {
        if (configXmlObj.getPreference(preferenceForRemove[i], 'android')) {
            removePreferenceInPlatform(preferenceForRemove[i], 'android');
        }
    }

    function removeGlobalPreference(preferenceName) {

        configXmlObj.doc.getroot()._children = configXmlObj.doc.getroot()._children.filter(function(obj) {
            return obj.attrib.name != preferenceName;
        })

        fs.writeFileSync(configXmlObj.path, configXmlObj.doc.write({ indent: 4 }), 'utf-8');
    }

    function removePreferenceInPlatform(preferenceName, platform) {

        var platformObj = configXmlObj.doc.getroot().findall('./platform').filter(function(obj) {
            if (obj.attrib.name == platform) return true;
            return false;
        })[0];

        platformObj._children = platformObj._children.filter(function(obj) {
            return obj.attrib.name != preferenceName;
        });

        fs.writeFileSync(configXmlObj.path, configXmlObj.doc.write({ indent: 4 }), 'utf-8');

    }

}
