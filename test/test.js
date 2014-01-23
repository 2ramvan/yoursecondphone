var _ = require("lodash");
var util = require("util");
var assert = require("assert");
var debug = require("debug")("ysp:tests")

var session = require("../system/session.js");

describe("session", function() {
	describe("store", function() {
		var sid, ot_session_id, req, res, cache;

		before(function(){
			req = {
				session: {}
			};
			res = {
				json: function(statusCode, response) {
					debug("res.json called: statusCode: %s - response: %j", statusCode, response);

					assert.equal(statusCode, 200, "Expected HTTP/1.1 200 OK, got something else");
					assert.equal(response.status, "success", "Expected status to be 'success', got something else");
					assert.equal(response.data.sid, sid, "Unexcpted value for data.sid");
					assert.equal(response.data.session_id, ot_session_id, "Unexcpted value for data.session_id");
					assert.equal(response.data.token, req.session[util.format("token_%s", sid)]);
				}
			};
			cache = {
				set: function(key, val) {
					sid = key;
					ot_session_id = val;
				}
			}
		})

		it("should return a normal response if there are no cookies set", function() {
			session.store(req, res);
		})
	})
})