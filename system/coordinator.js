'use strict';
var _, async, fs, util, lru, rooms, debug, sockets;

// 3rd party
_ = require('lodash');
async = require('async');
debug = require('debug')('coordinator');

// Internal
fs = require('fs');
util = require('util');

lru = require('lru-cache');
sockets = lru({
  maxAge: (1000 * 60 * 60 * 24)
});
rooms = lru({
  maxAge: (1000 * 60 * 60 * 24)
});

function RoomAbstract(room_id, first_peer) {
  if (!(this instanceof RoomAbstract)) return new RoomAbstract(room_id, first_peer);

  if (!room_id.match(/^\w(\w|-){1,30}$/)) {
    throw "invalid-room-id";
  }

  this.id = room_id;
  this.peers = [];

  // TODO - have a room secret that makes someone an admin of the room
  if (!!first_peer) {
    this.addPeer(first_peer);
  }
}
RoomAbstract.prototype.addPeer = function(peer_id) {
  if (this.peers.length < 3) {
    if (this.peers.indexOf(peer_id) < 0) {
      this.peers.push(peer_id);
    }
  } else {
    throw "room-full";
  }
}
RoomAbstract.prototype.removePeer = function(peer_id) {
  var index = this.peers.indexOf(peer_id);
  if (index >= 0) {
    var tmp = _.clone(this.peers);
    tmp.splice(index, 1);
    this.peers = tmp;
    return true;
  } else {
    return false;
  }
}
RoomAbstract.prototype.getPeers = function(exclude) {
  return this.peers.filter(function(peer_id) {
    return peer_id != exclude;
  });
}
RoomAbstract.prototype.getOtherPeers = RoomAbstract.prototype.getPeers;

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
    cb(null, sockets.get(_peer_id));
  }, function(err, sockets) {
    async.each(sockets, function(socket, cb) {
      if (!!socket) {
        socket.emit.apply(socket, args);
      }
      cb(null);
    })
  })
}

function register_coordinator(io) {

  io.on('connection', function(socket) {

    socket.on('room_exists', function(room_id, ack) {
      if (!socket)
        return;

      return ack(rooms.has(room_id));
    });

    socket.on('peer_id', function set_peer_id(peer_id, ack) {
      if (!socket)
        return;

      if (!peer_id || !peer_id.match(/^\w{1,64}$/)) {
        return ack('invalid-peer-id');
      }

      debug('new peer: %s', peer_id);

      socket.peer_id = peer_id;
      sockets.set(peer_id, socket);
      ack(null);
    });

    socket.on('join_room', function join_room(room_id, ack) {
      var room;

      if (!socket)
        return;

      if (!socket.hasOwnProperty('peer_id')) {
        return ack('no-peer-id');
      }

      debug('%s joining %s', socket.peer_id, room_id);

      try {

        if (rooms.has(room_id)) {
          room = rooms.get(room_id);
          room.addPeer(socket.peer_id);
        } else {
          room = new RoomAbstract(room_id, socket.peer_id);
          rooms.set(room_id, room);
        }

        return ack(null, room.getOtherPeers(socket.peer_id));
      } catch (e) {
        return ack(e);
      }

    });

    socket.on('leave_room', function leave_room(room_id) {
      var room;

      if (!socket)
        return;

      if (!socket.hasOwnProperty('peer_id')) {
        return;
      }

      debug('%s leaving %s', socket.peer_id, room_id);

      if (rooms.has(room_id)) {
        room = rooms.get(room_id);
        room.removePeer(socket.peer_id);

        if (room.isEmpty())
          rooms.del(room_id);
        else
          room.broadcast(socket.peer_id, 'peer_left', socket.peer_id);
      }

    });

    socket.on('disconnect', function() {

      if (!socket)
        return;

      socket.removeAllListeners();

      if (!socket.hasOwnProperty('peer_id'))
        return;

      sockets.del(socket.peer_id);

      rooms.forEach(function(room, room_id, rooms) {
        if (room.removePeer(socket.peer_id)) {
          if (room.isEmpty())
            rooms.del(room_id);
          else
            room.broadcast(socket.peer_id, 'peer_left', socket.peer_id);
        }
      })

    });

  });

}

module.exports = register_coordinator;