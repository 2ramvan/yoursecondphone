(function (global) {
  'use strict'

  /*
  global _
  global angular
  global EventEmitter
  global getUserMedia
  global io
  global Peer
   */

  angular.module('ysp-services', [])

  .service('supportsRealTimeCommunication', ['$log',
    function ($log) {
      return function () {
        if (!global.util.supports.audioVideo || !global.util.supports.data) {
          return false
        } else {
          return true
        }
      }
    }
  ])

  /*

oo.ooooo.   .ooooo.   .ooooo.  oooo d8b
 888' `88b d88' `88b d88' `88b `888""8P
 888   888 888ooo888 888ooo888  888
 888   888 888    .o 888    .o  888
 888bod8P' `Y8bod8P' `Y8bod8P' d888b
 888
o888o

 */

  .service('peer', ['$log', 'main_host', 'peer_server_port', 'ApplicationError', '$timeout', '$interval', '$rootScope',
    function ($log, main_host, peer_server_port, ApplicationError, $timeout, $interval, $rootScope) {
      var is_reconnect = false
      var attempting_to_reconnect = false

      var peer = new Peer({
        host: main_host,
        port: peer_server_port,
        path: '/peers',
        secure: true
      })

      peer.on('open', function (id) {
        $log.debug('peer: main peer connection open (%s)', id)

        if (!is_reconnect) {
          is_reconnect = true
        } else {
          $rootScope.$broadcast('peer:reconnect')
        }
      })

      peer.on('close', function () {
        $log.debug('peer: main peer connection closed')
      })

      peer.on('error', function (err) {
        if (err.type === 'network') {
          // prevent redundant reconnect operations
          if (attempting_to_reconnect) {
            return
          } else {
            attempting_to_reconnect = true
            $rootScope.disconnected = true
          }

          $log.debug('peer: lost connection to signaling server')

          var attempt = 0

          var itvl = $interval(function () {
            if (attempt >= 20) {
              $log.debug('peer: giving up on reconnecting')
              $interval.cancel(itvl)
              return
            }

            attempt++
            $log.debug('peer: attempting to reconnect (attempt: %d)', attempt)
            peer.reconnect()
          }, 1000)

          peer.once('open', function () {
            attempting_to_reconnect = false
            $rootScope.disconnected = false

            $interval.cancel(itvl)
            $log.debug('peer: reconnected!!')
          })

          // dont freak out
          return
        }

        $log.error('peer: %s', err.type, err)

        var fatal_ref = {
          'browser-incompatible': false, // we're letting other methods handle this
          'invalid-id': false,
          'invalid-key': false,
          'unavailable-id': false,
          'ssl-unavailable': true,
          'server-disconnected': false,
          'server-error': true,
          'socket-error': true,
          'socket-closed': true
        }

        return new ApplicationError(err.type, fatal_ref[err.type] || false)
      })

      peer.on('connection', function () {
        $log.debug('peer: incoming connection')
      })

      peer.on('call', function () {
        $log.debug('peer: incoming call')
      })

      return peer
    }
  ])

  /*
                                         oooo                      .
                                         `888                    .o8
             .oooo.o  .ooooo.   .ooooo.   888  oooo   .ooooo.  .o888oo
            d88(  "8 d88' `88b d88' `"Y8  888 .8P'   d88' `88b   888
            `"Y88b.  888   888 888        888888.    888ooo888   888
            o.  )88b 888   888 888   .o8  888 `88b.  888    .o   888 .
ooooooooooo 8""888P' `Y8bod8P' `Y8bod8P' o888o o888o `Y8bod8P'   "888"
 */

  .service('_socket', ['$log', 'main_host', 'ApplicationError',
    function ($log, main_host, ApplicationError) {
      var socket = io.connect('https://' + main_host, {
        path: '/coordinator'
      })

      socket.on('error', function (err) {
        console.error('socket-io-error', err)
        return new ApplicationError('socket-io-error', true)
      })

      socket.on('disconnect', function () {
        $log.debug('[_socket] - disconnected!')
      })

      socket.on('reconnect', function () {
        $log.debug('[_socket] - reconnected!')
      })

      return socket
    }
  ])

  /*
                                             .o8   o8o                            .
                                            "888   `"'                          .o8
 .ooooo.   .ooooo.   .ooooo.  oooo d8b  .oooo888  oooo  ooo. .oo.    .oooo.   .o888oo  .ooooo.  oooo d8b
d88' `"Y8 d88' `88b d88' `88b `888""8P d88' `888  `888  `888P"Y88b  `P  )88b    888   d88' `88b `888""8P
888       888   888 888   888  888     888   888   888   888   888   .oP"888    888   888   888  888
888   .o8 888   888 888   888  888     888   888   888   888   888  d8(  888    888 . 888   888  888
`Y8bod8P' `Y8bod8P' `Y8bod8P' d888b    `Y8bod88P" o888o o888o o888o `Y888""8o   "888" `Y8bod8P' d888b
*/

  .factory('coordinator', ['$log', '_socket', 'ApplicationError', 'peer', '$rootScope', '$q', '$timeout',
    function ($log, _socket, ApplicationError, peer, $rootScope, $q, $timeout) {
      var is_ready_state = false

      var exports = new EventEmitter()

      _socket.on('peer_left', function (id) {
        exports.emit('peer_left', id)
      })

      _socket.on('disconnect', function () {
        is_ready_state = false
      })

      _socket.on('reconnect', function () {
        var back_online = function () {
          $log.debug('coordinator: everything back online')
          is_ready_state = true
        }

        // if peer is still disconnected, wait for reconnect
        if (peer.disconnected) {
          var dereg = $rootScope.$on('peer:reconnect', function () {
            dereg()
            advertise_peer_id(back_online)
          })
        } else {
          // otherwise, just re-advertise
          advertise_peer_id(back_online)
        }
      })

      function room_exists (room_id, cb) {
        _socket.emit('room_exists', room_id, cb || angular.noop)
      }

      function advertise_peer_id (callback) {
        $log.debug('coordinator: advertising peer_id to coordinator...')

        var cb = function (err) {
          if (err) {
            return new ApplicationError(err, true)
          }
          $log.debug('coordinator: peer_id successfully advertised...')
          is_ready_state = true
          exports.emit('ready')
          ;(callback || angular.noop)()
        }

        if (_socket.connected) {
          _socket.emit('peer_id', peer.id, cb)
        } else {
          _socket.once('connect', function () {
            _socket.emit('peer_id', peer.id, cb)
          })
        }
      }

      function join_room (room_id) {
        return $q(function (resolve, reject) {
          if (is_ready_state) {
            _socket.emit('join_room', room_id, function (err, roomies) {
              if (err) return reject(err)
              $log.debug('coordinator: joined room (%s)', room_id)

              resolve(roomies)
            })
          } else {
            reject('no-peer-id')
          }
        })
      }

      function leave_room (room_id) {
        if (is_ready_state) {
          _socket.emit('leave_room', room_id)
        }
      }

      function isReady () {
        return is_ready_state
      }

      function promiseUntilReady () {
        return $q(function (resolve, reject) {
          if (is_ready_state) {
            resolve()
          } else {
            exports.once('ready', resolve)
          }

          $timeout(function () {
            exports.removeListeners('ready', resolve)
            reject('timed-out')
          }, 5000)
        })
      }

      exports.room_exists = room_exists
      exports.advertise_peer_id = advertise_peer_id
      exports.join_room = join_room
      exports.leave_room = leave_room
      exports.isReady = isReady
      exports.promiseUntilReady = promiseUntilReady

      return exports
    }
  ])

  /*
ooooooooo.                                oooooo   oooooo     oooo
`888   `Y88.                               `888.    `888.     .8'
 888   .d88'  .ooooo.   .ooooo.  oooo d8b   `888.   .8888.   .8'   oooo d8b  .oooo.   oo.ooooo.  oo.ooooo.   .ooooo.  oooo d8b
 888ooo88P'  d88' `88b d88' `88b `888""8P    `888  .8'`888. .8'    `888""8P `P  )88b   888' `88b  888' `88b d88' `88b `888""8P
 888         888ooo888 888ooo888  888         `888.8'  `888.8'      888      .oP"888   888   888  888   888 888ooo888  888
 888         888    .o 888    .o  888          `888'    `888'       888     d8(  888   888   888  888   888 888    .o  888
o888o        `Y8bod8P' `Y8bod8P' d888b          `8'      `8'       d888b    `Y888""8o  888bod8P'  888bod8P' `Y8bod8P' d888b
                                                                                       888        888
                                                                                      o888o      o888o
 */

  .factory('PeerWrapper', ['$log', 'peer', 'GumService', '$random', '$interval', '$timeout',
    function ($log, peer, GumService, $random, $interval, $timeout) {
      var COMM_TYPE_EVENT = 'event'
      var COMM_TYPE_MESSAGE = 'msg'
      var COMM_TYPE_CALLBACK = 'cb'

      function PeerWrapper (peer_id, dc, mc) {
        EventEmitter.apply(this, [])
        var self = this

        // keep track of consecutive dc errors
        // if the ticker reaches 10, kill
        var accumulated_dc_errors = 0

        this.id = peer_id

        // remote callbacks waiting queue
        this.waiting_cbs = {}

        this.dc = dc || peer.connect(peer_id) // either store passed in dataconnection or connect
        // to the peer
        this.mc = mc || peer.call(peer_id, GumService.getMediaStream()) // same here
        this.ms = null // mediastream goes here

        // MediaConnection handlers
        this.mc.on('stream', function (stream) {
          $log.debug("peer-mc(%s) 'stream' event", self.id)
          self.ms = stream
          self.emit('stream', stream)
        })

        this.mc.on('error', function (err) {
          $log.error('peer-mc(%s) error: ', self.id, err)
          self.emit('error-mc', err)
        })

        // DataConnection handlers
        this.dc.on('data', function (data) {
          accumulated_dc_errors = 0

          if (_.isObject(data)) {
            switch (_.get(data, 'type')) {
              case COMM_TYPE_EVENT:
                this._receiveEvent(data)
                break
              case COMM_TYPE_CALLBACK:
                this._receiveCallback(data)
                break
              case COMM_TYPE_MESSAGE:
                this._receiveMessage(data)
                break
              default:
                $log.error('unknown comm type (%s)', _.get(data, 'type'))
                break
            }
          }
        })

        this.dc.on('open', function () {
          $log.debug('peer-dc(%s) open', self.id)
          self.emit('open')
        })

        this.dc.on('close', function () {
          $log.debug('peer-dc(%s) close', self.id)
          self.emit('close', self.id)
        })

        this.dc.on('error', function (err) {
          accumulated_dc_errors += 1
          $log.error('peer-dc(%s)', self.id)
          self.emit('error-dc', err)

          if (accumulated_dc_errors > 10) {
            self.close()
          }
        })
      }
      PeerWrapper.prototype = _.create(EventEmitter.prototype, {
        constructor: PeerWrapper
      })

      PeerWrapper.forgeFromConnections = function (dc, mc) {
        // this will be used to create a PeerWrapper from just the
        // incoming connections

        // answer the call automatically
        mc.answer(GumService.getMediaStream())

        // do i really need a comment for this
        return new PeerWrapper(dc.peer, dc, mc)
      }

      function ucfirst (str) {
        return str.charAt(0).toUpperCase() + str.substr(1)
      }

      PeerWrapper.prototype.send = function () {
        var args = [].slice.call(arguments)
        var sendType = args.shift()
        var sendFn = '_send' + ucfirst(sendType)
        return this[sendFn].apply(this, args)
      }

      /**
       * Send an event to this peer
       */
      PeerWrapper.prototype._sendEvent = function () {
        // lets send an event to a remote peer
        var args = [].slice.call(arguments)
        var msg = {
          type: COMM_TYPE_EVENT,
          event_name: args.shift()
        }

        // if there is a function at the end of the arguments, store it and send
        // a cb_id so this event can be acknowledged
        if (_.isFunction(_.last(args))) {
          msg.cb_id = $random.string(20)
          this.waiting_cbs = args.pop()
        }

        msg.args = args

        // happy trails event!
        this.dc.send(msg)
      }

      /**
       * Send a message to this peer
       *
       * @param  {string} content A message to send
       * @return {void}
       */
      PeerWrapper.prototype._sendMessage = function (content) {
        this.dc.send({
          type: COMM_TYPE_MESSAGE,
          content: content
        })
      }

      PeerWrapper.prototype._receiveEvent = function (commData) {
        var cb = angular.noop
        // if there is a callback_id create a callback function that will
        // acknowledge
        if (_.has(commData, 'cb_id')) {
          cb = function () {
            this.dc.send({
              type: COMM_TYPE_CALLBACK,
              cb_id: commData.cb_id,
              args: [].slice.call(arguments)
            })
          }
        }
        var args = _.get(commData, 'args', [])
        args.push(cb)
        args.unshift(commData.event_name)
        this.emit.apply(this, args)
      }

      PeerWrapper.prototype._receiveCallback = function (commData) {
        _.get(this.waiting_cbs, commData.cb_id, angular.noop).apply(this, _.get(commData, 'args', []))
        delete this.waiting_cbs[commData.cb_id]
      }

      PeerWrapper.prototype._receiveMessage = function (commData) {
        this.emit('message', commData.content)
      }

      PeerWrapper.prototype.close = _.once(function () {
        var self = this

        // log for science
        $log.debug('close called...')

        // shutdown all connections
        this.mc.close()
        this.dc.close()

        // let everyone know this peer is done for
        this.emit('close', this.id)

        // give everyone time to receive the 'close' event
        // then detach all listeners
        $timeout(function () {
          self.removeAllListeners()
          self.dc.removeAllListeners()
          self.mc.removeAllListeners()
        }, 500)
      })

      return PeerWrapper
    }
  ])

  /*
  .oooooo.                                   .oooooo..o                                 o8o
 d8P'  `Y8b                                 d8P'    `Y8                                 `"'
888           oooo  oooo  ooo. .oo.  .oo.   Y88bo.       .ooooo.  oooo d8b oooo    ooo oooo   .ooooo.   .ooooo.
888           `888  `888  `888P"Y88bP"Y88b   `"Y8888o.  d88' `88b `888""8P  `88.  .8'  `888  d88' `"Y8 d88' `88b
888     ooooo  888   888   888   888   888       `"Y88b 888ooo888  888       `88..8'    888  888       888ooo888
`88.    .88'   888   888   888   888   888  oo     .d8P 888    .o  888        `888'     888  888   .o8 888    .o
 `Y8bood8P'    `V88V"V8P' o888o o888o o888o 8""88888P'  `Y8bod8P' d888b        `8'     o888o `Y8bod8P' `Y8bod8P'
 */

  .service('GumService', ['$log', '$rootScope', 'ApplicationError', '$q',
    function ($log, $rootScope, ApplicationError, $q) {
      var ms = null
      var isInvoked = false

      this.invoke = function gum_invoke () {
        if (!_.isFunction(getUserMedia)) {
          return $q.reject('browser-incompatible')
        }
        return $q(function (resolve, reject) {
          if (!!ms && isInvoked) {
            return resolve(ms)
          }
          getUserMedia({
            video: true,
            audio: true
          }, function (stream) {
            $rootScope.$broadcast('gum:invoke', stream)

            ms = stream
            isInvoked = true
            resolve(ms)
          }, function () {
            $rootScope.$broadcast('gum:error', 'no-webcam')

            // the error from this isn't very descriptive
            // but since we ran quite a few tests to see if gUM is available
            // chances are that webcam access was denied, so...
            reject('no-webcam')
          })
        })
      }

      this.revoke = function gum_revoke () {
        if (ms) {
          ms.stop()
        }
        ms = null
        isInvoked = false

        $rootScope.$broadcast('gum:revoke')
      }

      this.getMediaStream = function gum_retrieve () {
        return ms
      }
    }
  ])

  .service('$random', ['$log',
    function ($log) {
      function rand_string (length) {
        length = length || 15
        var out = []
        var possible = 'abcdefghijklmnopqrstuvwxyz0123456789'

        for (var i = 0; i < length; i++) {
          out.push(possible.charAt(Math.round(Math.random() * possible.length)))
        }
        return out.join('')
      }

      function rand_int (max, min) {
        max = max || 1
        min = min || 0

        return Math.round(Math.random() * (max - min) + min)
      }

      this.string = rand_string
      this.integer = rand_int
    }
  ])
})(this)
