var _ = require("lodash");
var uaparser = require("ua-parser-js");

exports.check_compatibility = function(){
	var parser = new uaparser();

	return function(req, res, next){
		req.ua = (parser.setUA(req.get("User-Agent"))).getResult();

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
	};
};

exports.check_for_dnt = function(){
	return function(req, res, next){
		var dnt = req.get("Dnt");
		dnt = (new Boolean(dnt)).valueOf();

		if(dnt) {
			res.locals.ga = false;
			next();
		} else {
			next();
		}
	};
};