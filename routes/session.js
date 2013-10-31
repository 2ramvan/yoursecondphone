var debug = require("debug")("ysp:session");
var _ = require("lodash");
var LRU = require("lru-cache");
var OpenTok = require("opentok");
var async = require("async");
var fs = require("fs");
var ysp_config = require("../ysp_config.js");

var ot_key = ysp_config.ot_key;
var ot_secret = ysp_config.ot_secret;
var ot = new OpenTok.OpenTokSDK(ot_key, ot_secret);

// Start the cache
var cache = LRU({
	max: 500,
	maxAge: 1000 * 60 * 60 * 24
});

module.exports = function(server) {
	server.get("/session/create", function(req, res) {
		debug("Session create!");
		// If User's Session is already attached to an existing YSP Session, look for it in the Cache
		if (req.session.hasOwnProperty("sid")) {
			debug("User already has 'sid'...")
			var sid = req.session.sid;

			// If the YSP Session is still around, load it up and return its data back to the user
			if (cache.has(sid)) {
				get_token(sid, req.session, function(err, token) {
					res.json(201, {
						status: "success",
						data: {
							sid: sid,
							session_id: cache.get(sid),
							token: token
						}
					});
				});
				return;
			} else {
				// If the YSP Session is not still around, flush the User's Session data and continue with creating a new YSP Session
				req.session = {};
			}
		}

		debug("Creating new session...");

		var ot_session_id, ot_token, sid;
		async.waterfall([
			function(callback_1) {
				debug("Contacting opentok...");
				var location = "127.0.0.1";
				ot.createSession(location, {
					"p2p.preference": "enabled"
				}, function(session_id) {
					ot_session_id = session_id;
					callback_1(null, session_id);
				});
			},
			function(session_id, callback_1) {
				debug("Getting token...");
				ot_token = ot.generateToken({
					session_id: session_id
				});
				callback_1(null);
			},
			function(callback_1) {
				debug("Generating 'sid'...");
				sid = generate_sid();
				callback_1(null);
			},
			function(callback_1) {
				debug("Storing metadata...");
				cache.set(sid, ot_session_id);
				req.session.sid = sid;
				req.session["token_{1}".assign(sid)] = ot_token;

				callback_1(null, ot_session_id, ot_token, sid);
			}
		], function(err, ot_sesh, ot_tkn, sidd) {
			debug("Sending response...");
			res.json(201, {
				status: "success",
				data: {
					sid: sidd,
					session_id: ot_sesh,
					token: ot_tkn
				}
			});
			return;
		});
	});

	server.get("/session/:sid", function(req, res) {
		var sid = req.param("sid");
		if (sid.match(/^[b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou]$/)) {
			if(cache.has(sid)) {
				var session_id = cache.get(sid);
				get_token(sid, req.session, function(err, token){
					res.json(200, {
						status: "success",
						data: {
							sid: sid,
							session_id: session_id,
							token: token
						}
					});
				});
			} else {
				req.session = {};
				res.json(200, {
					status: "fail",
					data: {
						code: 11101
					}
				});
				return;
			}
		} else {
			req.session = {};
			res.json(200, {
				status: "fail",
				data: {
					code: 1005
				}
			});
			return;
		}
	});
};

var get_token = function(sid, user_session, callback) {
	var tkn;
	if (user_session.hasOwnProperty("token_{1}".assign(sid))) {
		tkn = user_session["token_{1}".assign(sid)];
		callback(null, tkn);
	} else {
		if (cache.has(sid)) {
			tkn = ot.generateToken({
				session_id: sid
			});
			callback(null, tkn);
		} else {
			callback("Cache does not have that SID...");
		}
	}
};

var generate_sid = function() {
	var consonants = "bcdfghjklmnpqrstvwxyz";
	var vowels = "aeiou";

	var out = "";

	for (var i = 0; i < 8; i++) {
		switch (i % 2) {
			case 0:
				out += consonants.charAt(Math.round(Math.random() * 20));
				break;
			default:
				out += vowels.charAt(Math.round(Math.random() * 4));
				break;
		}
	}

	return out;
};