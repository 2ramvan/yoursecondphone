var _ = require('lodash')
var assert = require('assert')
var async = require('async')
var events = require('events')

var coordinator = require('../system/coordinator')

/*
global describe
global it
global beforeEach
global afterEach
 */

describe('RoomAbstract', function () {
  var RoomAbstract = require('../system/RoomAbstract')

  describe('constructor', function () {
    var room

    it('should return a RoomAbstract instance when given a valid room id', function () {
      room = new RoomAbstract('i-am-a-room')

      assert.equal(room.id, 'i-am-a-room', 'passed in room_id is not the one set on the `id` property')
      assert.ok(_.isArray(room.peers), 'room.peers is not an array')
      assert.equal(room.peers.length, 0, 'room.peers has something in it')
    })

    it('should throw an error when given an invalid `room_id`', function () {
      var err

      try {
        room = new RoomAbstract('i-@m-!nvalid')
      } catch (e) {
        err = e
      }

      assert.ok(!!err, 'did not get that error')
      assert.ok(err.message, 'invalid-room-id', 'did not get the right error code')
    })
  })

  describe('#addPeer', function () {
    it('should add the specified peer if the room is not full (it is not) and is not already present (is not)', function () {
      var binder = {
        peers: ['peer1']
      }

      RoomAbstract.prototype.addPeer.call(binder, 'peer2')

      assert.equal(binder.peers.length, 2, 'peer array did not have 2 elements')
      assert.ok(_.contains(binder.peers, 'peer2'), '`peer2` was not found in the array')
    })

    it('should not add the peer and should throw an error if the room is full', function () {
      var err

      var binder = {
        peers: ['peer1', 'peer2', 'peer3']
      }

      try {
        RoomAbstract.prototype.addPeer.call(binder, 'peer4')
      } catch (e) {
        err = e
      }

      assert.ok(!!err, 'did not get that error')
      assert.equal(err.message, 'room-full', 'got an unexpected error message')
      assert.equal(binder.peers.length, 3, 'the peers array was affected')
      assert.ok(!_.contains(binder.peers, 'peer4'), '`peer4` made it into the peers array')
    })

    it('should not add the specified peer if it is already present', function () {
      var binder = {
        peers: ['peer1', 'peer2']
      }

      RoomAbstract.prototype.addPeer.call(binder, 'peer2')

      assert.deepEqual(binder.peers, ['peer1', 'peer2'], 'the peers array was changed')
    })
  })

  describe('#removePeer', function () {
    it('should remove the specified peer and return a boolean indicating whether or not the array was changed', function () {
      var binder = {
        peers: ['peer1', 'peer2']
      }

      var changed = RoomAbstract.prototype.removePeer.call(binder, 'peer2')

      assert.deepEqual(binder.peers, ['peer1'], 'the array was not correctly changed')
      assert.ok(_.isBoolean(changed), 'a boolean was not returned')
      assert.ok(changed, 'the returned value incorrectly reflects the change')
    })

    it('should not remove the specified peer (because it was not there to remove) and return a boolean indicating no change', function () {
      var binder = {
        peers: ['peer1', 'peer2']
      }

      var changed = RoomAbstract.prototype.removePeer.call(binder, 'peer3')

      assert.deepEqual(binder.peers, ['peer1', 'peer2'], 'the array was changed when it should not have been')
      assert.ok(_.isBoolean(changed), 'a boolean was not returned')
      assert.ok(!changed, 'the boolean incorrectly indicates the change of state')
    })
  })

  describe('#getPeers', function () {
    it('should return an array of peers without the specified peer', function () {
      var binder = {
        peers: ['peer1', 'peer2', 'peer3']
      }

      var otherPeers = RoomAbstract.prototype.getPeers.call(binder, 'peer2')

      assert.deepEqual(otherPeers, ['peer1', 'peer3'], 'did not get back the expected array')
    })

    it('should just return all peers if the specified peer is not in the array', function () {
      var binder = {
        peers: ['joe', 'bob', 'mike']
      }

      var otherPeers = RoomAbstract.prototype.getPeers.call(binder, 'rob')

      assert.deepEqual(otherPeers, ['joe', 'bob', 'mike'], 'got back an unexpected array')
    })
  })

  describe('#isEmpty', function () {
    it('should return `true` if the peers array is empty', function () {
      var binder = {
        peers: []
      }

      var empty = RoomAbstract.prototype.isEmpty.call(binder)

      assert.ok(empty, 'wrong value returned, was expecting `true`')
    })

    it('should return `false` if there are peers in the room', function () {
      var empty = RoomAbstract.prototype.isEmpty.call({
        peers: ['peer1']
      })

      assert.ok(!empty, 'wrong value returned, was expecting `false`')
    })
  })
})

describe('coordinator', function () {
  // this is a stub of a socket.io instance
  var emulate_socket_io = function (num_dummies, callback) {
    // make `num_dummies` and optional param, defaulting to 1
    if (_.isFunction(num_dummies)) {
      callback = num_dummies
      num_dummies = 1
    }

    // make a place to put our dummies
    var dummies = []

    // create the dummies
    for (var i = 0; i < num_dummies; i++) {
      // to properly emulate room broadcasts, attach a unique id
      // to the dummies

      var id = _.uniqueId('socket_')
      var d = new events.EventEmitter()
      d.id = id

      dummies.push(d)
    }

    // here is where it gets interesting
    return {
      // create a stub for registering an event
      on: function (e, h) {
        // just keep an eye out for `connection` thats all we care about
        if (e === 'connection') {
          // push the dummies into the connection events handler
          for (var i = 0; i < num_dummies; i++) {
            h(dummies[i])
          }

          // and give the test the array of dummies so it can set up a scenario
          callback(dummies)
        }
      },
      // emulate room broadcasts
      to: function (room) {
        return _.find(dummies, { id: room })
      }
    }
  }

  describe('room_exists', function () {
    var dummy_socket

    beforeEach(function (done) {
      coordinator(emulate_socket_io(function (dummies) {
        var a = dummies[0]

        async.series([
          _.bind(a.emit, a, 'peer_id', 'peer1'),
          _.bind(a.emit, a, 'join_room', 'this-room-exists')
        ], function (err) {
          if (err) throw err

          dummy_socket = a

          done()
        })
      }))
    })

    it('should acknowledge with a boolean of true, because the room does exist', function (done) {
      dummy_socket.emit('room_exists', 'this-room-exists', function (exists) {
        assert.ok(exists, 'got `false`, was expecting `true`')

        done()
      })
    })

    it('should acknowledge with a boolean of false, because the room does not exist', function (done) {
      dummy_socket.emit('room_exists', 'i-dont-exist', function (exists) {
        assert.ok(!exists, 'got `true`, was expecting `false`')
        done()
      })
    })
  })

  describe('peer_id', function () {
    var dummy_socket, a, b

    beforeEach(function (done) {
      coordinator(emulate_socket_io(3, function (dummies) {
        dummy_socket = dummies[0]
        a = dummies[1]
        a.connected = false
        b = dummies[2]
        b.connected = true

        async.series([
          _.bind(a.emit, a, 'peer_id', 'peer1'),
          _.bind(b.emit, b, 'peer_id', 'peer2')
        ], function (err) {
          if (err) throw new Error(err)

          done()
        })
      }))
    })

    afterEach(function () {
      dummy_socket.emit('disconnect')
      a.emit('disconnect')
      b.emit('disconnect')
    })

    it('should accept a valid peer_id and return no error', function (done) {
      dummy_socket.emit('peer_id', 'peer3', function (err) {
        assert.ok(!err, 'got an unexpected error')
        assert.equal(dummy_socket.peer_id, 'peer3', 'peer_id property not set on the socket')
        done()
      })
    })

    it('should reject an invalid peer_id', function (done) {
      dummy_socket.emit('peer_id', 'i-@m-inval!d', function (err) {
        assert.ok(!!err, 'did not get that error')
        assert.equal(err, 'invalid-peer-id', 'got an unexpected error code')
        done()
      })
    })

    it('should reject when no peer_id is passed in', function (done) {
      dummy_socket.emit('peer_id', null, function (err) {
        assert.ok(!!err, 'did not get that error')
        assert.equal(err, 'invalid-peer-id', 'got an unexpected error code')
        done()
      })
    })
  })

  describe('join_room', function () {
    var dummy_socket
    var a
    var b
    var c

    beforeEach(function (done) {
      coordinator(emulate_socket_io(4, function (dummies) {
        dummy_socket = dummies[0]
        a = dummies[1]
        b = dummies[2]
        c = dummies[3]

        async.series([
          _.bind(async.parallel, async, [
            _.bind(dummy_socket.emit, dummy_socket, 'peer_id', 'peer0'),
            _.bind(a.emit, a, 'peer_id', 'peer1'),
            _.bind(b.emit, b, 'peer_id', 'peer2')
          ]),
          _.bind(a.emit, a, 'join_room', 'this-room-is-lovely'),
          _.bind(b.emit, b, 'join_room', 'this-room-is-lovely')
        ], function (err) {
          if (err) throw new Error(err)

          done()
        })
      }))
    })

    afterEach(function () {
      dummy_socket.emit('disconnect')
      a.emit('disconnect')
      b.emit('disconnect')
      c.emit('disconnect')
    })

    it("should let the peer create a validly id'd room and return an empty array", function (done) {
      dummy_socket.emit('join_room', 'another-room', function (err, peers) {
        assert.ok(!err, 'got an unexpected error')
        assert.deepEqual(peers, [], 'did not get an empty array')

        dummy_socket.emit('room_exists', 'another-room', function (exists) {
          assert.ok(exists, 'coordinator claims the newly created room does not exist')
          done()
        })
      })
    })

    it('should reject if the room_id is not valid', function (done) {
      dummy_socket.emit('join_room', 'i-@m-not-val!d', function (err, peers) {
        assert.ok(err, 'did not get that error')
        assert.equal(err, 'invalid-room-id')
        assert.ok(!peers, 'something other than an error was returned')

        done()
      })
    })

    it('should not let the peer create a room if it has not established its peer_id', function (done) {
      c.emit('join_room', 'i-am-valid', function (err) {
        assert.ok(err, 'did not get that error')
        assert.equal(err, 'no-peer-id', 'got an unexpected error code')
        done()
      })
    })

    it('should return the other peers in the room upon joining an occupied room', function (done) {
      dummy_socket.emit('join_room', 'this-room-is-lovely', function (err, peers) {
        peers.sort() // sort the peers

        assert.ok(!err, 'got an unexpected error')
        assert.deepEqual(peers, ['peer1', 'peer2'], 'got an unexpected array of peers')
        done()
      })
    })

    it('should not let the peer join a room if it is full (3 peers is full)', function (done) {
      async.series([
        function (cb) {
          c.emit('peer_id', 'peer3', cb)
        },
        function (cb) {
          c.emit('join_room', 'this-room-is-lovely', cb)
        }
      ], function (err) {
        if (err) throw new Error(err)

        dummy_socket.emit('join_room', 'this-room-is-lovely', function (err, peers) {
          assert.ok(err, 'did not get that error')
          assert.equal(err, 'room-full', 'got an unexpected error code')
          done()
        })
      })
    })
  })

  describe('leave_room', function () {
    var dummy_socket
    var a
    var b

    beforeEach(function (done) {
      coordinator(emulate_socket_io(3, function (dummies) {
        dummy_socket = dummies[0]
        a = dummies[1]
        b = dummies[2]

        async.series([
          _.bind(async.parallel, async, [
            _.bind(dummy_socket.emit, dummy_socket, 'peer_id', 'peer0'),
            _.bind(a.emit, a, 'peer_id', 'peer1')
          ]),
          _.bind(dummy_socket.emit, dummy_socket, 'join_room', 'this-room-is-lovely'),
          _.bind(a.emit, a, 'join_room', 'this-room-is-lovely')
        ], function (err) {
          if (err) throw new Error(err)

          done()
        })
      }))
    })

    afterEach(function () {
      dummy_socket.emit('disconnect')
      a.emit('disconnect')
    })

    it('should remove emitting peer from the room and notify other peers', function (done) {
      a.once('peer_left', function (peer_that_left) {
        assert.equal(peer_that_left, 'peer0', 'got the wrong leaving peer')
        done()
      })
      dummy_socket.emit('leave_room', 'this-room-is-lovely')
    })

    it('should remove the emitting peer and delete the room, because it is empty', function (done) {
      a.emit('leave_room', 'this-room-is-lovely')
      dummy_socket.emit('leave_room', 'this-room-is-lovely')

      setTimeout(function () {
        b.emit('room_exists', 'this-room-is-lovely', function (exists) {
          assert.ok(!exists, 'the empty room still exists')
          done()
        })
      }, 15)
    })
  })

  describe('disconnect', function () {
    var dummy_socket
    var a
    var b

    beforeEach(function (done) {
      coordinator(emulate_socket_io(3, function (dummies) {
        dummy_socket = dummies[0]
        a = dummies[1]
        b = dummies[2]

        async.series([
          _.bind(async.parallel, async, [
            _.bind(dummy_socket.emit, dummy_socket, 'peer_id', 'peer0'),
            _.bind(a.emit, a, 'peer_id', 'peer1')
          ]),
          _.bind(dummy_socket.emit, dummy_socket, 'join_room', 'this-room-is-lovely'),
          _.bind(a.emit, a, 'join_room', 'this-room-is-lovely')
        ], function (err) {
          if (err) throw new Error(err)

          done()
        })
      }))
    })

    afterEach(function () {
      if (dummy_socket) {
        dummy_socket.emit('disconnect')
      }
      a.emit('disconnect')
      b.emit('disconnect')
    })

    it('should tell others in the related room that a peer has left', function (done) {
      a.once('peer_left', function (peer_that_left) {
        assert.equal(peer_that_left, 'peer0', 'did not get the right value for `peer_that_left`')
        done()
      })
      dummy_socket.emit('disconnect')
    })

    it('should destroy the room when all peers have disconnected', function (done) {
      a.emit('disconnect')
      dummy_socket.emit('disconnect')

      setTimeout(function () {
        b.emit('room_exists', 'this-room-is-lovely', function (exists) {
          assert.ok(!exists, 'coordinator says the room still exists')
          done()
        })
      }, 20)
    })
  })
})
