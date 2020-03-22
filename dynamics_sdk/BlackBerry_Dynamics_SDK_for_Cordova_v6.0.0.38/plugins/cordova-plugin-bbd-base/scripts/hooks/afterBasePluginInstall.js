#!/usr/bin/env node

/*
 * (c) 2018 BlackBerry Limited. All rights reserved.
 */

module.exports = function(context) {
    var fse = require('fs-extra'),
        fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        configXmlPath = path.join(context.opts.projectRoot, 'config.xml'),
        basePluginProjectPath = path.join(context.opts.projectRoot, 'plugins', 'cordova-plugin-bbd-base'),
        hookDestination = path.join(context.opts.projectRoot, 'hooks', 'afterBasePluginRemove.js');

    process.on('exit', function() {
        // Copy our hook to application's hooks folder
        // This hook will be self removed

        if (!fs.existsSync(hookDestination)) {
            fse.copySync(path.join(basePluginProjectPath, 'scripts', 'hooks', 'afterBasePluginRemove.js'), hookDestination);
            fs.chmodSync(hookDestination, '770');
        }

        // Make hook abvailable in main config.xml file of the application
        if (fs.existsSync(configXmlPath)) {
            var configXmlContent = fs.readFileSync(configXmlPath, { encoding: 'utf8' });
            if (configXmlContent.indexOf('afterBasePluginRemove.js') < 0) {
                configXmlContent = configXmlContent.replace('</widget>', '\t<hook src="hooks/afterBasePluginRemove.js" type="after_plugin_rm" />\n</widget>');
                fs.writeFileSync(configXmlPath, configXmlContent, 'utf8');
            }
        }
    });
};
