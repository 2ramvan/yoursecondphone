var _ = require("lodash");

exports.index = function(req, res){
	var sid = req.params.sid;

	res.locals.page_id = "main";
	res.locals.skipIntro = false;
	res.locals.show_ad = true;

	if( ! _.isUndefined(sid) || req.session.sid) {
		res.locals.skipIntro = true;
	}

	if( ! _.isUndefined(sid) ) {
		res.locals.no_crawl_index = true;
	}

	res.render("root_index");
};
exports.dev = function(req, res){
	res.send(req.ua.browser.name + " " + req.ua.browser.major);
};