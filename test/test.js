var io = require('socket.io-client');
var _ = require('lodash');
var async = require('async');
var util = require('util');
var neg = null;

var neg_host = "https://negotiate.ysp.im";
var neg_port = 9091;

var valid_peer_id = "ztyk2fj68yk138fr";
var valid_peer_id_2 = "m2kdbske0sleh5bf";
var valid_peer_id_3 = "psv38f0xb5l2xdl2";

var valid_peer_id_regex = /^\w$/;

exports["negotiator"] = {};
exports["negotiator"]["connect"] = function(test) {
	test.expect(1);

	neg = io.connect(neg_host + ":" + neg_port);
	neg.on("connect", function() {
		test.ok(1,1);
		test.done();
	});
}

exports["negotiator"]["join room without setting peer_id"] = function(test) {
	test.expect(2);

	neg.emit("join_room", "testroom", function(err, roomies) {
		test.ok(!!err, "did NOT result in an error.");
		test.equal(err, "no-peer-id", "UNEXPECTED error");
		test.done();
	});
}

exports["negotiator"]["invalid peer id"] = function(test) {
	test.expect(2);

	neg.emit("peer_id", "g@rb@g3", function(err) {
		test.ok(!!err, "did NOT result in an error.");
		test.equal(err, "invalid-peer-id", "UNEXPECTED error");
		test.done();
	});
}

exports["negotiator"]["valid peer id"] = function(test) {
	test.expect(1);

	neg.emit("peer_id", valid_peer_id, function(err) {
		test.ok(!err);
		test.done();
	});
}

exports["negotiator"]["invalid room id"] = function(test) {
	test.expect(2);

	neg.emit("join_room", "inv@lid-r00m-!d", function(err, roomies) {
		test.ok(!!err);
		test.equal(err, "invalid-room-id");
		test.done();
	})
}

exports["negotiator"]["valid room id"] = function(test) {
	test.expect(2);

	neg.emit("join_room", "testroom", function(err, roomies) {
		test.ok(!err);
		test.ok(_.isArray(roomies));
		test.done();
	})
}