const { Cc, Cu } = require("chrome");
const { Services } = Cu.import("resource://gre/modules/Services.jsm");
const tabs = require("sdk/tabs");
const prefs_service = require("sdk/preferences/service");

// GM imports
const { GM_util } = Cu.import("chrome://greasemonkey-modules/content/util.js");
const { GM_prefRoot } = Cu.import(
		"chrome://greasemonkey-modules/content/prefmanager.js");


let _orig_isGreasemonkeyable;

function refresh_script(tab) {
	if (GM_prefRoot.getValue("aboutIsGreaseable")
			&& Services.io.extractScheme(tab.url) === "about") {

		let config = GM_util.getService().config;
		config.updateModifiedScripts("document-start", null);
		config.updateModifiedScripts("document-end", null);
		config.updateModifiedScripts("document-idle", null);
	}
}


function replace() {
	_orig_isGreasemonkeyable = GM_util.isGreasemonkeyable;

	GM_util.isGreasemonkeyable = function(url) {
		var scheme = Services.io.extractScheme(url);

		switch (scheme) {
			case "http":
			case "https":
			case "ftp":
				return true;
			case "about":
				return GM_prefRoot.getValue("aboutIsGreaseable");
			case "file":
				return GM_prefRoot.getValue("fileIsGreaseable");
			case "unmht":
				return GM_prefRoot.getValue("unmhtIsGreaseable");
		}
		return false;
	}

	tabs.on("ready", refresh_script);
	tabs.on("activate", refresh_script);
}

function restore(reason) {
	GM_util.isGreasemonkeyable = _orig_isGreasemonkeyable;
}


exports.main = replace;
exports.onUnload = restore;