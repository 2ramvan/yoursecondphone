var _ = require("lodash");
var debug = require("debug")("ysp:middleware");

exports.redirect_to_secure = function(){
	return function(req, res, next){
		res.set("X-Powered-By", "node.js + express");

		if(req.secure){
			next();
		}else {
			debug("Unsecure request; redirecting...");
			res.redirect(301, "https://" + req.host + "/" + req.url);
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