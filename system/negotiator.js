process.title = "Your Second Phone - negotiator";

// 3rd party
var io = require('socket.io');
var PeerServer = require('peer').PeerServer;
var _ = require('lodash');
var async = require('async');

// Internal
var fs = require('fs');
var util = require('util');

var ssl = {
	key: fs.readFileSync("/Users/nkcmr/Desktop/yoursecondphone_certs/server.unencrypted.key"),
	cert: fs.readFileSync("/Users/nkcmr/Desktop/negotiate.ysp.im/negotiate_ysp_im.crt"),
	ca: [
		fs.readFileSync("/Users/nkcmr/Desktop/negotiate.ysp.im/RapidSSL_CA.crt")
	]
};

var LRU = require('lru-cache');
socket_cache = LRU({
	max: 500,
	maxAge: (1000 * 60 * 60 * 6)
});
room_cache = LRU({
	max: 250,
	maxAge: (1000 * 60 * 60 * 24)
});

function RoomAbstract(room_id, first_peer) {
	if(!(this instanceof RoomAbstract)) return new RoomAbstract(room_id, first_peer);

	if(!room_id.match(/^\w(\w|-){1,20}$/)){
		throw "invalid-room-id";
	}

	this.id = room_id;
	this.peers = [];

	// TODO - have a room secret that makes someone an admin of the room

	this.addPeer(first_peer);
}
RoomAbstract.prototype.addPeer = function(peer_id) {
	if(this.peers.length < 3){
			if(this.peers.indexOf(peer_id) < 0){
				this.peers.push(peer_id);
			}
	}else{
		throw "room-full";
	}
}
RoomAbstract.prototype.removePeer = function(peer_id) {
	var index = this.peers.indexOf(peer_id);
	if(index >= 0){
		var tmp = _.clone(this.peers);
		tmp.splice(index, 1);
		this.peers = tmp;
		return true;
	}else{
		return false;
	}
}
RoomAbstract.prototype.getPeers = function(exclude) {
	return this.peers.filter(function(peer_id) {
		return peer_id != exclude;
	});
}
RoomAbstract.prototype.isEmpty = function() {
	return !this.peers.length;
}
RoomAbstract.prototype.broadcast = function() {
	var args = Array.prototype.slice.call(arguments);
	var exclude = args.shift();

	var audience = this.peers.filter(function(peer_id) {
		return peer_id != exclude;
	});

	async.map(audience, function(_peer_id, cb) {
		cb(null, socket_cache.get(_peer_id));
	}, function(err, sockets) {
		async.each(sockets, function(socket, cb) {
			socket.emit.apply(socket, args);
			cb(null);
		})
	})
}

var negotiator = io.listen(9091, ssl);

var signaler = PeerServer({
	port: 9090,
	ssl: ssl
});

negotiator.sockets.on("connection", function(socket) {

	socket.on("peer_id", function set_peer_id(peer_id, ack) {

		if(!peer_id.match(/^\w{1,64}$/)){
			return ack("invalid-peer-id");
		}

		console.log("New Peer (%s)", peer_id);

		async.waterfall([
			function(callback) {
				socket.set("peer_id", peer_id, callback);
			},
			function(callback) {
				socket_cache.set(peer_id, socket);
				callback(null);
			}
		], function() {
			ack(null);
		});

	});

	socket.on("leave_room", function leave_room(room_id) {
		
		async.waterfall([
			function(callback) {
				socket.get("peer_id", callback);
			},
			function(peer_id, callback) {
				console.log("Peer (%s) leaving '%s'", peer_id, room_id);

				if(room_cache.has(room_id)){
					var room = room_cache.get(room_id);

					if(room.isEmpty()){
						room_cache.del(room_id);
					}else{
						room.broadcast(peer_id, "peer_left", peer_id);
					}

					room.removePeer(peer_id);
				}
			}
		]);

	});

	socket.on("join_room", function join_room(room_id, ack) {
		
		async.waterfall([
			function(callback) {

				// First we need the peer_id it should be attached to the socket
				socket.get("peer_id", function(err, peer_id) {
					if(err || !peer_id)
						return callback("no-peer-id");

					callback(null, peer_id);
				});
			},
			function(peer_id, callback) {
				var room;

				// now we need to put the peer in the room
				
				// is this room already in cache?
				if(room_cache.has(room_id)){

					// good
					room = room_cache.get(room_id);

					// try to add the peer
					try{
						room.addPeer(peer_id);
					}catch(e){
						// expects "room-full"
						return callback(e);
					}
				}else{
					// establish new Room
					
					try{
						room = new RoomAbstract(room_id, peer_id);
					}catch(e){
						// expects "invalid-room-id"
						return callback(e);
					}

					room_cache.set(room_id, room);
				}

				callback(null, room, peer_id);
			}
		], function(err, room, peer_id) {
			if(err){
				return ack(err);
			}

			console.log("Peer (%s) joining '%s'", peer_id, room.id);

			// we don't need to tell the room that this peer has joined
			// because we just pass the new peer a list of all people
			// in the room and he automatically connects
			// 
			return ack(null, room.getPeers(peer_id));
		})

	})

	socket.on("disconnect", function() {
		
		async.waterfall([
			function(callback) {
				socket.get("peer_id", callback);
			},
			function(peer_id, callback) {
				room_cache.forEach(function(room, room_id, room_cache) {
					if(room.removePeer(peer_id)){
						room.broadcast(peer_id, "peer_left", peer_id);
					}
				});

				console.log("Peer (%s) disconnected", peer_id);

				setTimeout(function() {
					callback(null, peer_id);
				}, 500);
			},
			function(peer_id, callback) {
				callback(null, peer_id);
				socket_cache.del(peer_id);
			}
		])

	});

});