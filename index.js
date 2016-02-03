const { Cc, Cu } = require("chrome");
const { Services } = Cu.import("resource://gre/modules/Services.jsm");
const { AddonManager } = require("resource://gre/modules/AddonManager.jsm");

const tabs = require("sdk/tabs");
const prefs_service = require("sdk/preferences/service");


let GM_INSTALLED = false;

const gm_imports = {};
let AbstractScript_global;

let _orig_isGreasemonkeyable;
let _orig_gAboutBlankRegexp;


function replace() {
	console.log(gm_imports);
	_orig_isGreasemonkeyable = gm_imports.GM_util.isGreasemonkeyable;
	_orig_gAboutBlankRegexp = AbstractScript_global.gAboutBlankRegexp;

	gm_imports.GM_util.isGreasemonkeyable = function(url) {
		let scheme = Services.io.extractScheme(url);

		switch (scheme) {
			case "http":
			case "https":
			case "ftp":
				return true;
			case "file":
				return gm_imports.GM_prefRoot.getValue("fileIsGreaseable");
			case "unmht":
				return gm_imports.GM_prefRoot.getValue("unmhtIsGreaseable");

			// Custom scheme exceptions
			case "about":
				return gm_imports.GM_prefRoot.getValue("aboutIsGreaseable");
			case "chrome":
				return gm_imports.GM_prefRoot.getValue("chromeIsGreaseable");
		}
		return false;
	}

	if (gm_imports.GM_prefRoot.getValue("aboutIsGreaseable")) {
		// Remove explicit declaration for about:blank
		AbstractScript_global.gAboutBlankRegexp = /(?!)/;
	}

	function refresh_script(tab) {
		if (gm_imports.GM_util.isGreasemonkeyable(tab.url)) {
			let config = gm_imports.GM_util.getService().config;
			config.updateModifiedScripts("document-start", null);
			config.updateModifiedScripts("document-end", null);
			config.updateModifiedScripts("document-idle", null);
		}
	}

	tabs.on("ready", refresh_script);
	tabs.on("activate", refresh_script);
}

function restore(reason) {
	gm_imports.GM_util.isGreasemonkeyable = _orig_isGreasemonkeyable;
	AbstractScript_global.gAboutBlankRegexp = _orig_gAboutBlankRegexp;
}


function startup() {
	// Replace existing addon
	AddonManager.getAddonByID("@gmpermissive", function(addon) {
		if (addon !== null) {
			addon.uninstall();
		}

		// Check for Greasemonkey
		AddonManager.getAddonByID(
				"{e4a8a97b-f2ed-450b-b12d-ee082ba24781}", function(addon) {
			if (addon !== null) {
				GM_INSTALLED = true;

				// GM imports
				Cu.import("chrome://greasemonkey-modules/content/util.js", gm_imports);
				Cu.import("chrome://greasemonkey-modules/content/prefmanager.js", gm_imports);
				Cu.import("chrome://greasemonkey-modules/content/abstractScript.js", gm_imports);
				AbstractScript_global = Cu.getGlobalForObject(gm_imports.AbstractScript);
				replace();
			} else {
				// TODO: Notify about GM dependency
			}
		});
	});
}
function shutdown() {
	if(GM_INSTALLED) {
		restore();
	}
}


exports.main = startup;
exports.onUnload = shutdown;