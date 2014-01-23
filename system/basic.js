var _ = require("lodash");

var basic = {};
basic.about = function(req, res){
	res.render("about", {
		page_id: "about"
	});
};

basic.privacy = function(req, res){
	res.render("privacy", {
		page_id: "privacy"
	});
};

basic.terms = function(req, res){
	res.render("terms", {
		page_id: "terms"
	});
};

basic.donate = function(req, res){
	res.render("donate", {
		page_id: "donate"
	});
}

basic.index = function(req, res){
	// GET /^\/([b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou])?$/

	var sid = req.params[0];

	res.locals.page_id = "main";
	res.locals.skipIntro = false;
	res.locals.show_ad = true;

	if (!_.isUndefined(sid) || req.session.sid) {
		res.locals.skipIntro = true;
	}

	if (!_.isUndefined(sid)) {
		res.locals.no_crawl_index = true;
	}

	res.render("index", {
		page_id: "main"
	});
}

basic.not_found = function(req, res){
	res.status(404);

	if(req.accepts("html")) {
		res.render("not_found", {
			page_id: "not_found"
		});
	}
};

basic.server_error = function(err, req, res, next){
	console.error("ERROR: %s - %s", new Date(), err.hasOwnProperty("stack") ? err.stack : err);

	res.status(500);
	res.render("server_error", {
		page_id: "server_error"
	});
};

module.exports = basic;
