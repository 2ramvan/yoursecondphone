'use strict';
var _, async, fs, util, lru, rooms, debug, sockets, RoomAbstract;

// 3rd party
_ = require('lodash');
async = require('async');
debug = require('debug')('coordinator');

// Internal
fs = require('fs');
util = require('util');

RoomAbstract = require('./RoomAbstract');

lru = require('lru-cache');
sockets = lru({
  maxAge: (1000 * 60 * 60 * 24)
});
rooms = lru({
  maxAge: (1000 * 60 * 60 * 24)
});

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

      debug('%s has disconnected', socket.peer_id);

      sockets.del(socket.peer_id);

      var disc_peer_id = socket.peer_id;

      rooms.forEach(function(room, room_id, rooms) {
        if (room.removePeer(disc_peer_id)) {
          if (room.isEmpty())
            rooms.del(room_id);
          else
            room.broadcast(disc_peer_id, 'peer_left', disc_peer_id);
        }
      });

      socket = null;
    });

  });

}

module.exports = register_coordinator;