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

var messenger = require("messenger");
var master = messenger.createSpeaker(9921);

// Start the cache
var cache = {
	get: function(key, callback) {
		master.request("cache:get", key, callback || function() {});
	},
	set: function(key, val, callback) {
		master.request("cache:set", { key: key, val: val }, callback || function() {});
	},
	has: function(key, callback) {
		master.request("cache:has", key, callback || function() {});
	},
	del: function(key, callback) {
		master.request("cache:del", key, callback || function() {});
	}
};

module.exports = function(server) {
	server.get("/session/create", function(req, res) {
		debug("Session create!");

		var sid = req.session.sid || null;

		async.waterfall([

			function(callback_1) {
				if (sid) {
					debug("User already has 'sid'");

					cache.has(sid, function(haz) {
						if (haz) {
							get_token(sid, req.session, function(err, token) {
								if (err) {
									cache.del(sid);
									req.session.hasOwnProperty("token_{1}".assign(sid)) && delete req.session["token_{1}".assign(sid)];
									req.session.hasOwnProperty("sid") && delete req.session.sid;

									console.error("ERROR: %s - %s", new Date(), err.hasOwnProperty("stack") ? err.stack : err);

									return callback_1({
										status: "error",
										code: 11105,
										message: "An unknown error occured."
									});
								} else {
									cache.get(sid, function(session_id) {
										callback_1({
											status: "success",
											data: {
												sid: sid,
												session_id: session_id,
												token: token
											}
										})
									});
								}
							});
						} else {
							req.session = {};
							callback_1(null);
						}
					});
				} else {
					callback_1(null);
				}
			},
			function(callback_1){
				debug("Creating new session...");

				var ot_session_id, ot_token, sid;
				async.waterfall([

					function(callback_2) {
						debug("Contacting opentok...");
						var location = "127.0.0.1";
						ot.createSession(location, {
							"p2p.preference": "enabled"
						}, function(session_id) {
							ot_session_id = session_id;
							callback_2(null, session_id);
						});
					},
					function(session_id, callback_2) {
						debug("Getting token...");
						ot_token = ot.generateToken({
							session_id: session_id
						});
						callback_2(null);
					},
					function(callback_2) {
						debug("Generating 'sid'...");
						sid = generate_sid();
						callback_2(null);
					},
					function(callback_2) {
						debug("Storing metadata...");
						cache.set(sid, ot_session_id);
						req.session.sid = sid;
						req.session["token_{1}".assign(sid)] = ot_token;

						callback_2(null, ot_session_id, ot_token, sid);
					}
				], function(err, ot_sesh, ot_tkn, sidd) {
					debug("Sending response...");
					return callback_1({
						status: "success",
						data: {
							sid: sidd,
							session_id: ot_sesh,
							token: ot_tkn
						}
					});
				});

			}
		], function(response) {
			if(response){
				return res.json(200, response);
			}
		});
	});

	server.get("/session/:sid", function(req, res) {
		var sid = req.param("sid"),
			ot_token,
			ot_session_id;

		async.waterfall([
			function(callback){
				if(sid.match(/^[b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou][b-df-hj-np-tv-z][aeiou]$/)){
					callback(null);
				} else {
					callback(new Error(1005));
				}
			},
			function(callback){
				cache.has(sid, function(haz){
					if(haz){
						callback(null);
					}else {
						callback(new Error(11101));
					}
				});
			},
			function(callback){
				cache.get(sid, function(session_id){
					ot_session_id = session_id;
					callback(null);
				});
			},
			function(callback){
				get_token(sid, req.session, function(err, token){
					if(err){
						cache.del(sid);
						req.session.hasOwnProperty("token_{1}".assign(sid)) && delete req.session["token_{1}".assign(sid)];
						req.session.hasOwnProperty("sid") && delete req.session.sid;

						console.error("ERROR: %s - %s", new Date(), err.hasOwnProperty("stack") ? err.stack : err);
						return callback({
							status: "error",
							code: 11105,
							message: "An unknown error occured."
						});
					}

					ot_token = token;
					callback(null);
				});
			},
			function(callback){
				callback({
					status: "success",
					data: {
						sid: sid,
						session_id: ot_session_id,
						token: ot_token
					}
				});
			}
		], function(a, b){
			if(a){
				if(a instanceof Error){
					return res.json(200, {
						status: "fail",
						data: {
							code: parseInt(a.message)
						}
					});
				} else {
					return res.json(200, a);
				}
			}
		});
	});
};

var get_token = function(sid, user_session, callback) {
	var tkn;
	if (user_session.hasOwnProperty("token_{1}".assign(sid))) {
		tkn = user_session["token_{1}".assign(sid)];
		callback(null, tkn);
	} else {
		cache.has(sid, function(haz){
			if (haz) {
				cache.get(sid, function(session_id){
					try {
						tkn = ot.generateToken({
							session_id: session_id
						});
					} catch (e) {
						return callback(e);
					}

					user_session["token_{1}".assign(sid)] = tkn;
					callback(null, tkn);

				});
			} else {
				callback(new Error("Cache does not have that SID..."));
			}
		});
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