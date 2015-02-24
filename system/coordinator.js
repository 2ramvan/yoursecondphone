'use strict'

// 3rd party
var _ = require('lodash')
var debug = require('debug')('coordinator')

var RoomAbstract = require('./RoomAbstract')

var sockets = {}

var rooms = require('lru-cache')({
  maxAge: (1000 * 60 * 60 * 24)
})

function register_coordinator (io) {
  io.on('connection', function (socket) {
    socket.on('room_exists', function (room_id, ack) {
      debug('room_exists(\'%s\')', room_id)

      return ack(rooms.has(room_id))
    })

    socket.on('peer_id', function set_peer_id (peer_id, ack) {
      if (!_.isString(peer_id) || !peer_id.match(/^\w{1,64}$/)) {
        return ack('invalid-peer-id')
      }

      debug('new peer: %s', peer_id)

      socket.peer_id = peer_id
      sockets[peer_id] = socket.id
      ack(null)
    })

    socket.on('join_room', function join_room (room_id, ack) {
      var room

      if (!socket.hasOwnProperty('peer_id')) {
        return ack('no-peer-id')
      }

      debug('%s joining %s', socket.peer_id, room_id)

      try {
        if (rooms.has(room_id)) {
          room = rooms.get(room_id)
          room.addPeer(socket.peer_id)
        } else {
          room = new RoomAbstract(room_id, socket.peer_id)
          rooms.set(room_id, room)
        }

        return ack(null, room.getOtherPeers(socket.peer_id))
      } catch (e) {
        return ack(e.message)
      }
    })

    socket.on('leave_room', function leave_room (room_id) {
      var room

      if (!socket.hasOwnProperty('peer_id')) {
        return
      }

      var pid = socket.peer_id

      debug('%s leaving %s', socket.peer_id, room_id)

      if (rooms.has(room_id)) {
        room = rooms.get(room_id)
        if (room.removePeer(socket.peer_id)) {
          if (room.isEmpty()) {
            rooms.del(room_id)
          } else {
            var audience = _.map(room.getPeers(), function (peer_id) {
              return sockets[peer_id]
            })

            _.forEach(audience, function (socket_id) {
              if (socket_id)
                io.to(socket_id).emit('peer_left', pid)
            })
          }
        }
      }
    })

    socket.on('disconnect', function () {
      socket.removeAllListeners()

      // if no `peer_id` was found, then this was just a visitor
      // just set `socket` to null
      if (!socket.hasOwnProperty('peer_id')) {
        socket = null
        return
      }

      debug('%s has disconnected', socket.peer_id)

      delete sockets[socket.peer_id]

      var disc_peer_id = socket.peer_id

      rooms.forEach(function (room, room_id, rooms) {
        if (room.removePeer(disc_peer_id)) {
          if (room.isEmpty()) {
            rooms.del(room_id)
          } else {
            // broadcast
            var audience = _.map(room.getPeers(), function (peer_id) {
              return sockets[peer_id]
            })

            _.forEach(audience, function (socket_id) {
              if (socket_id)
                io.to(socket_id).emit('peer_left', disc_peer_id)
            })
          }
        }
      })

      socket = null
    })
  })
}

module.exports = register_coordinator
