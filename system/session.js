var debug = require("debug")("ysp:session");
var _ = require("lodash");
var OpenTok = require("opentok");
var async = require("async");
var fs = require("fs");
var util = require("util");

var ot_key = process.env.OT_KEY;
var ot_secret = process.env.OT_SECRET;
var ot = new OpenTok(ot_key, ot_secret);

var Slave = require("flic").slave;
var slv = new Slave(function(){
	debug("Slave connected.");
});

// Start the cache
var cache = {
	get: function(key, callback) {
		slv.tell("cache:get", key, function(err, val){
			if(err) throw err;

			callback.call(null, val);
		});
	},
	set: function(key, val) {
		slv.tell("cache:set", key, val);
	},
	has: function(key, callback) {
		slv.tell("cache:has", key, function(err, haz){
			if(err) throw err;

			callback.call(null, haz);
		});
	},
	del: function(key) {
		slv.tell("cache:del", key);
	}
};

var session = {};
session.store = function(req, res){
	// POST /session

	var reviveSession = function(a, callback){
		// a -> sid

		debug("Cool! Let's revive that session.");
		async.waterfall([
			function(callback_1){
				debug("reviveSession - getting token");
				get_token(sid, req.session, function(err, token){
					if(err){
						debug("reviveSession - error getting token");
						cache.del(sid);
						req.session.hasOwnProperty(util.format("token_%s", sid)) && delete req.session[util.format("token_%s", sid)];
						req.session.hasOwnProperty("sid") && delete req.session.sid;

						console.error("ERROR: %s - %s", new Date(), err.hasOwnProperty("stack") ? err.stack : err);
						callback_1(err);
					}else{
						callback_1(null, token);
					}
				});
			},
			function(ot_token, callback_1){
				debug("reviveSession - getting session id");
				cache.get(a, function(ot_session_id){
					callback_1(null, ot_session_id, ot_token);
				});
			},
			function(ot_session_id, ot_token, callback_1){
				debug("reviveSession - sending response");
				callback_1(null, {
					status: "success",
					data:{
						sid: a,
						session_id: ot_session_id, 
						token: ot_token
					}
				});
			}
		], callback);
	};
	var createNewSession = function(a, callback){
		// a -> sid

		debug("That's okay. We'll just create a new one!");

		async.waterfall([
			function(callback_1){
				debug("createNewSession - contacting opentok");
				ot.createSession({
					location: "127.0.0.1",
					p2p: true
				}, callback_1);
			},
			function(ot_session_id, callback_1){
				debug("createNewSession - generating opentok token");
				var ot_token = ot.generateToken(ot_session_id);
				callback_1(null, ot_session_id, ot_token);
			},
			function(ot_session_id, ot_token, callback_1){
				debug("createNewSession - generating sid");
				var sid = generate_sid();
				callback_1(null, ot_session_id, ot_token, sid);
			},
			function(ot_session_id, ot_token, sid, callback_1){
				req.session.sid = sid;
				cache.set(sid, ot_session_id);
				debug("createNewSession - sending response");
				callback_1(null, {
					status: "success",
					data: {
						session_id: ot_session_id, 
						token: ot_token,
						sid: sid
					}
				});
			}
		], callback);
	};

	var sid = req.session.sid || null;

	async.waterfall([
		function(callback_1){
			debug("Does user have an 'sid' already stored in cookie? %s", !!sid ? "Yes!" : "No.");
			if(!!sid){
				cache.has(sid, function(haz){
					debug("Does the cache have the user's 'sid'? %s", haz ? "Yes!" : "No.");
					if(haz){
						reviveSession(sid, callback_1);
					}else {
						createNewSession(sid, callback_1);
					}
				});
			} else {
				createNewSession(sid, callback_1);
			}
		}
	], function(err, response){
		if(err) throw err;

		return res.json(200, response);
	});
};

session.show = function(req, res){
	debug("Retrieve Session...");
	var sid = req.param("sid"),
		ot_token,
		ot_session_id;

	async.waterfall([
		function(callback){
			debug("Checking ")
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
					req.session.hasOwnProperty(util.format("token_%s", sid)) && delete req.session[util.format("token_%s", sid)];
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
};

var get_token = function(sid, user_session, callback) {
	var tkn;
	if (user_session.hasOwnProperty(util.format("token_%s", sid))) {
		tkn = user_session[util.format("token_%s", sid)];
		callback(null, tkn);
	} else {
		cache.has(sid, function(haz){
			if (haz) {
				cache.get(sid, function(session_id){
					debug("get_token - session_id:%s", session_id);
					try {
						tkn = ot.generateToken(session_id);
					} catch (e) {
						return callback(e);
					}
					user_session[util.format("token_%s", sid)] = tkn;
					callback(null, tkn);
				});
			} else {
				callback(new Error("Problem retrieving a token."));
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

module.exports = session;