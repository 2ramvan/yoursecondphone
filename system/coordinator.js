'use strict';
var _, async, fs, util, lru, rooms, debug, sockets, RoomAbstract;

// 3rd party
_ = require('lodash');
async = require('async');
debug = require('debug')('coordinator');

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
      debug('room_exists(\'%s\')', room_id);

      return ack(rooms.has(room_id));
    });

    socket.on('peer_id', function set_peer_id(peer_id, ack) {
      if (!_.isString(peer_id) || !peer_id.match(/^\w{1,64}$/)) {
        return ack('invalid-peer-id');
      }

      debug('new peer: %s', peer_id);

      // if there is already a peer with this id, check if connected
      if (sockets.has(peer_id)) {
        var a = sockets.get(peer_id);
        if (a.connected) {
          return ack('invalid-peer-id');
        } else
          sockets.del(peer_id);
        // if not connected just continue and replace
      }

      socket.peer_id = peer_id;
      sockets.set(peer_id, socket);
      ack(null);
    });

    socket.on('join_room', function join_room(room_id, ack) {
      var room;

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
        return ack(e.message);
      }

    });

    socket.on('leave_room', function leave_room(room_id) {
      var room;

      if (!socket.hasOwnProperty('peer_id')) {
        return;
      }

      var pid = socket.peer_id;

      debug('%s leaving %s', socket.peer_id, room_id);

      if (rooms.has(room_id)) {
        room = rooms.get(room_id);
        if (room.removePeer(socket.peer_id)) {
          if (room.isEmpty())
            rooms.del(room_id);
          else {
            var audience = _.map(room.getPeers(), function(peer_id) {
              return sockets.get(peer_id);
            });

            audience.forEach(function(peer) {
              peer.emit('peer_left', pid);
            });
          }
        }
      }
    });

    socket.on('disconnect', function() {
      socket.removeAllListeners();

      // if no `peer_id` was found, then this was just a visitor
      // just set `socket` to null
      if (!socket.hasOwnProperty('peer_id')) {
        socket = null;
        return;
      }

      debug('%s has disconnected', socket.peer_id);

      sockets.del(socket.peer_id);

      var disc_peer_id = socket.peer_id;
      socket = null;

      rooms.forEach(function(room, room_id, rooms) {
        if (room.removePeer(disc_peer_id)) {
          if (room.isEmpty())
            rooms.del(room_id);
          else {
            // broadcast
            var audience = _.map(room.getPeers(), function(peer_id) {
              return sockets.get(peer_id);
            });

            audience.forEach(function(peer, idx, arr) {
              peer.emit('peer_left', disc_peer_id);
            });
          }
        }
      });
    });

  });

}

module.exports = register_coordinator;