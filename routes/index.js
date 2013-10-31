var _ = require("lodash");


module.exports = function(server) {
	server.get("/about", function(req, res){
		res.render("about", {
			page_id: "about"
		});
	});

	server.get("/privacy", function(req, res){
		res.render("privacy", {
			page_id: "privacy"
		});
	});

	server.get("/terms", function(req, res){
		res.render("terms", {
			page_id: "terms"
		});
	});

	server.get("/donate", function(req, res){
		res.render("donate", {
			page_id: "donate"
		});
	});

	server.get(/^\/([b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou])?$/, function(req, res) {
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
	});

	server.get("/dev", function(){
		res.send(req.ua.browser.name + " " + req.ua.browser.major);
	});
};