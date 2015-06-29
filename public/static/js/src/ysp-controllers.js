(function (global) {
  'use strict'

  /*
  global $
  global _
  global angular
  global async
  */

  angular.module('ysp-controllers', ['ngSanitize'])

  /*
oooooooooooo                                        .oooooo.       .            oooo
`888'     `8                                       d8P'  `Y8b    .o8            `888
 888         oooo d8b oooo d8b  .ooooo.  oooo d8b 888          .o888oo oooo d8b  888
 888oooo8    `888""8P `888""8P d88' `88b `888""8P 888            888   `888""8P  888
 888    "     888      888     888   888  888     888            888    888      888
 888       o  888      888     888   888  888     `88b    ooo    888 .  888      888
o888ooooood8 d888b    d888b    `Y8bod8P' d888b     `Y8bood8P'    "888" d888b    o888o
 */

  .controller('ErrorCtrl', ['$log', '$scope', '$routeParams', 'peer_server_port', '$sce',
    function ($log, $scope, $routeParams, peer_server_port, $sce) {
      function neg () {
        return $sce.trustAsHtml('Your Second Phone is unable to communicate with the server. This is probably because your firewall is blocking access to port <b>' + peer_server_port + '</b>. These are vital to <b>Your Second Phone</b> working.')
      }

      var error_descriptions = {
        'no-webcam': 'Your Second Phone was denied access to the webcam, or their is not one available!',
        'server-error': neg('server-error'),
        'browser-incompatible': 'Your browser is not capable of making video calls, please use the latest version of <a target="_blank" href="https://www.google.com/chrome">Google Chrome</a>, <a target="_blank" href="https://www.mozilla.org/firefox">Firefox</a> or <a target="_blank" href="http://www.opera.com/">Opera</a>',
        'ssl-unavailable': 'An error was encountered while attempting to establish a secure connection with the server.',
        'socket-error': neg('socket-error'),
        'socket-io-error': neg('socket-io-error'),
        'timed-out': neg('timed-out'),
        'room-full': 'There are already 3 people in this room, which is the limit for rooms.'
      }

      $scope.error_id = $routeParams.err_type
      $scope.error_description = error_descriptions[$scope.error_id] || 'An unknown error has occured.'
    }
  ])

/*
ooooooooo.                           .     .oooooo.       .            oooo
`888   `Y88.                       .o8    d8P'  `Y8b    .o8            `888
 888   .d88'  .ooooo.   .ooooo.  .o888oo 888          .o888oo oooo d8b  888
 888ooo88P'  d88' `88b d88' `88b   888   888            888   `888""8P  888
 888`88b.    888   888 888   888   888   888            888    888      888
 888  `88b.  888   888 888   888   888 . `88b    ooo    888 .  888      888
o888o  o888o `Y8bod8P' `Y8bod8P'   "888"  `Y8bood8P'    "888" d888b    o888o
*/

  .controller('RootCtrl', ['$log', '$scope', 'GumService', '$random', '$location', 'supportsRealTimeCommunication', 'coordinator', 'ApplicationError', '$timeout',
    function ($log, $scope, GumService, $random, $location, supportsRealTimeCommunication, coordinator, ApplicationError, $timeout) {
      $scope.current_step = 0

      if (supportsRealTimeCommunication()) {
        $scope.current_step = 1
      } else {
        $scope.current_step = -1
      }

      $scope.error_message = ''
      $scope.room_name = ''
      $scope.valid_room_name = true

      $scope.$watch('room_name', function (newVal, oldVal) {
        if (newVal === '') {
          $scope.valid_room_name = true
          return
        }

        $scope.valid_room_name = (/^\w(\w|-){1,30}$/).test(newVal)
      })

      $scope.loading_gum = false
      $scope.initGum = function () {
        $scope.loading_gum = true

        GumService.invoke()

        .then(function () {
          $scope.current_step += 1
          $timeout(angular.noop)
        }, function () {
          return new ApplicationError('no-webcam', true)
        })

        .finally(function () {
          $scope.loading_gum = false
        })
      }

      $scope.loading_room = false
      $scope.error_message = ''
      $scope.launchRoom = function () {
        $scope.loading_room = true
        $log.debug('Launching room... %s', $scope.room_name)

        if (!$scope.valid_room_name || $scope.room_name === '') {
          $scope.room_name = $random.string(10)
        }
        coordinator.room_exists($scope.room_name, function (exists) {
          $scope.loading_room = false
          if (exists) {
            $scope.error_message = 'Sorry, that room name is already taken.'
            $timeout(angular.noop)
            $timeout(function () {
              $scope.error_message = ''
            }, 5000)
          } else {
            $location.path('/' + $scope.room_name)
            $timeout(angular.noop)
          }
        })
      }
    }
  ])

  /*
ooooooooo.                                           .oooooo.       .            oooo
`888   `Y88.                                        d8P'  `Y8b    .o8            `888
 888   .d88'  .ooooo.   .ooooo.  ooo. .oo.  .oo.   888          .o888oo oooo d8b  888
 888ooo88P'  d88' `88b d88' `88b `888P"Y88bP"Y88b  888            888   `888""8P  888
 888`88b.    888   888 888   888  888   888   888  888            888    888      888
 888  `88b.  888   888 888   888  888   888   888  `88b    ooo    888 .  888      888
o888o  o888o `Y8bod8P' `Y8bod8P' o888o o888o o888o  `Y8bood8P'    "888" d888b    o888o
 */

  .controller('RoomCtrl', ['$q', '$timeout', '$log', '$scope', 'GumService', '$location', '$routeParams', 'coordinator', 'ApplicationError', 'PeerWrapper', 'peer', 'fullscreen', '$random', '$rootScope', 'supportsRealTimeCommunication',
    function ($q, $timeout, $log, $scope, GumService, $location, $routeParams, coordinator, ApplicationError, PeerWrapper, peer, fullscreen, $random, $rootScope, supportsRealTimeCommunication) {
      if (!supportsRealTimeCommunication()) {
        return new ApplicationError('browser-incompatible', true)
      }
      $scope.room_id = $routeParams.room_id
      $scope.room_link = 'http://ysp.im/#/' + $routeParams.room_id
      $scope.peers = []
      $scope.messages = []
      $scope.draft = ''
      $scope.showMessages = true

      $scope.isFullscreen = false

      // ng-class helper that helps the peer holders determine the correct column size
      $scope.getColumnSize = function () {
        var nums = ['col-md-12', 'col-md-12', 'col-md-6']
        return nums[$scope.peers.length]
      }

      // goFullscreen if you need help determining what this does, study code a bit more
      $scope.goFullscreen = function () {
        fullscreen.request(document.querySelector('div#all-streams'))
        $timeout(angular.noop)
      }

      $scope.sendMessage = function () {
        if ($scope.draft) {
          if ($scope.peers.length) {
            async.each($scope.peers, function (peer, cb) {
              peer.send('message', $scope.draft)
              cb(null)
            }, function () {
              pushMessageToScope({
                from: peer.id,
                content: $scope.draft,
                time_received: new Date()
              })

              $scope.draft = ''
              $log.debug('Message sent!')
            })
          }
        }
      }

      function pushMessageToScope (msg) {
        // message required fields
        // from
        // time_received
        // content
        // color_code (not-required)
        $scope.messages.push(msg)
        $rootScope.$broadcast('ysp:message')
      }

      // apply the scope when fullscreen state changes
      $(document).on(fullscreen.raw.fullscreenchange, function () {
        $timeout(angular.noop)
      })

      // here is where we tear down
      $rootScope.$on('$routeChangeStart', function (e) {
        coordinator.leave_room($routeParams.room_id)
        coordinator.removeAllListeners()
        $(document).off(fullscreen.raw.fullscreenchange)
      })

      // reflect fullscreen indicator to the scope
      $scope.$watch(function () {
        return fullscreen.isFullscreen
      }, function (newVal) {
        $scope.isFullscreen = newVal
      })

      $scope.$on('peer:reconnect', function () {
        coordinator.once('ready', function () {
          coordinator.join_room($scope.room_id)
        })
      })

      $q.all([
        GumService.invoke(),
        coordinator.promiseUntilReady()
      ])
      .then(function () {
        return coordinator.join_room($scope.room_id)
      })
      .then(function (roomies) {
        var mc_pool = {} // Put orphan MediaConnections here, wait for their DirectConnection
        var dc_pool = {} // visa-versa

        peer.on('call', function (mc) {
          if (!dc_pool.hasOwnProperty(mc.peer)) {
            $log.debug('mc(%s) received before dc, waiting...', mc.peer)
            mc_pool[mc.peer] = mc
          } else {
            $log.debug('mc(%s) arrived!', mc.peer)
            var dc = dc_pool[mc.peer]
            delete dc_pool[mc.peer]

            var new_peer = PeerWrapper.forgeFromConnections(dc, mc)
            attachEventsAndPush(new_peer)
          }
        })

        peer.on('connection', function (dc) {
          if (!mc_pool.hasOwnProperty(dc.peer)) {
            $log.debug('dc(%s) received before mc, waiting...', dc.peer)
            dc_pool[dc.peer] = dc
          } else {
            $log.debug('dc(%s) arrived!', dc.peer)
            var mc = mc_pool[dc.peer]
            delete mc_pool[dc.peer]

            var new_peer = PeerWrapper.forgeFromConnections(dc, mc)
            attachEventsAndPush(new_peer)
          }
        })

        var colors = ['green', 'blue', 'purple', 'orange', 'red']
        var taken_colors = []

        // this is the entry point for all peers, existing and new
        function attachEventsAndPush (peerWrapper) {
          // pick a color for the peer
          do {
            peerWrapper.color_code = colors[$random.integer(4)]
          } while (_.contains(taken_colors, peerWrapper.color_code))

          taken_colors.push(peerWrapper.color_code)

          // once the peer closes up shop, lets do the same and disconnect all events and such
          peerWrapper.once('close', function (id) {
            // relinquish the color
            var i = taken_colors.indexOf(peerWrapper.color_code)
            taken_colors.splice(i, 1)

            $log.debug('peer(%s) closed, pruning...', id)

            // remove it from the array
            $scope.peers = $scope.peers.filter(function (peer) {
              return peer.id !== id
            })
            $timeout(angular.noop)
          })

          peerWrapper.on('message', function (message) {
            // form the message
            var msg = {}

            msg.color_code = peerWrapper.color_code
            msg.content = message
            msg.time_received = new Date()
            msg.from = peerWrapper.id

            pushMessageToScope(msg)
            $scope.showMessages = true
            $timeout(angular.noop)
          })

          $scope.peers.push(peerWrapper)
          $timeout(angular.noop)
        }

        // this is the primary way of knowing when someone has left
        coordinator.on('peer_left', function (id) {
          $log.debug('[RoomCtrl] - coordinator said that (%s) left', id)

          var peerw = _.find($scope.peers, { id: id })

          if (peerw) {
            peerw.close()

            var idx = taken_colors.indexOf(peerw.color_code)
            if (idx >= 0) taken_colors.splice(idx, 1)

            $scope.peers = $scope.peers.filter(function (peer) {
              return peer.id !== id
            })

            $log.debug('[RoomCtrl] - successfully removed %s', id)
          }

          $timeout(angular.noop)
        })

        // process peers given by the coordinator
        roomies.forEach(function (peer_id, index, roomies_internal_ref) {
          var new_peer = new PeerWrapper(peer_id)
          attachEventsAndPush(new_peer)
        })
      })

      .catch(function (err) {
        return new ApplicationError(err, true)
        // expecting

        // no-webcam
        // browser-incompatible
        // room-full
        // timed-out
      })
    }
  ])
})(this)
