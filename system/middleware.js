var _ = require("lodash");
var uaparser = require("ua-parser-js");
var debug = require("debug")("ysp:middleware");

exports.check_compatibility = function(){
	var parser = new uaparser();

	return function(req, res, next){
		req.ua = (parser.setUA(req.get("User-Agent"))).getResult();

		if(req.query.ignore_browser_compat == "yes"){
			res.locals.compatible_browser = true;
			next();
		} else {
			if (_.contains(["Chrome", "Firefox", "Chromium"], req.ua.browser.name)) {
				if(_.contains(["Chrome", "Chromium"], req.ua.browser.name)) {
					if(parseInt(req.ua.browser.major) >= 24) {
						res.locals.compatible_browser = true;
					}
				} else if (req.ua.browser.name == "Firefox") {
					if(parseInt(req.ua.browser.major) >= 22) {
						res.locals.compatible_browser = true;
					}
				}
			}

			next();
		}
	};
};

exports.redirect_to_secure = function(){
	return function(req, res, next){
		res.set("X-Powered-By", "node.js + express");

		if(req.secure){
			next();
		}else {
			debug("Unsecure request; redirecting...");
			res.redirect(301, "https://yoursecondphone.co" + req.url);
		}
	}
};

exports.set_strict_transport_security = function(){
	return function(req, res, next){
		// Enable Strict Transport Security; max age possible.
		// http://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security
		res.set("Strict-Transport-Security", "max-age=31536000");
		next();
	}
};