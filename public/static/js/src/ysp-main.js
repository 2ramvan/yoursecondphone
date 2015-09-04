(function (global) {
  'use strict'

  /*
  global _
  global angular
  global screenfull
  global sessionStorage
  */

  global.$debug = function enableDebug (setTo) {
    if (_.isBoolean(setTo) && _.has(global, 'sessionStorage')) {
      sessionStorage.debug = setTo

      if (global.location && _.isFunction(global.location.reload)) {
        global.location.reload()
      }
    }
  }

  angular.module('ysp', ['ysp-services', 'ysp-controllers', 'ysp-directives', 'ngRoute', 'ngSanitize'])

  .constant('main_host', 'yoursecondphone.co')

  .constant('peer_server_port', parseInt(window.location.port, 10) || 443)

  .value('fullscreen', screenfull)

  .config(['$logProvider',
    function ($logProvider) {
      $logProvider.debugEnabled((!!sessionStorage) && sessionStorage.debug === 'true')
    }
  ])

  .config(['$routeProvider',
    function ($routeProvider) {
      $routeProvider.when('/', {
        controller: 'RootCtrl',
        templateUrl: '/static/views/root.html'
      })

      $routeProvider.when('/error/:err_type', {
        controller: 'ErrorCtrl',
        templateUrl: '/static/views/error.html'
      })

      $routeProvider.when('/:room_id', {
        controller: 'RoomCtrl',
        templateUrl: '/static/views/room.html'
      })

      $routeProvider.otherwise({
        redirectTo: '/'
      })
    }
  ])

  .run(['$log', 'peer', 'coordinator', 'ApplicationError', '$interval', '$rootScope',
    function ($log, peer, coordinator, ApplicationError, $interval, $rootScope) {
      if (peer.open) {
        coordinator.advertise_peer_id()
      } else {
        peer.once('open', function (id) {
          coordinator.advertise_peer_id()
        })
      }

      if (_.isObject(navigator) && _.isBoolean(navigator.onLine)) {
        $log.debug('observing online state')

        $interval(function () {
          $rootScope.navOnline = navigator.onLine
        }, 50)
      }
    }
  ])

  .factory('ApplicationError', ['$log', '$location', '$rootScope', '$timeout',
    function ($log, $location, $rootScope, $timeout) {
      function ApplicationError (type, panic) {
        panic = _.isBoolean(panic) ? panic : false
        if (_.has(Error, 'captureStackTrace')) {
          Error.captureStackTrace(this, ApplicationError)
        }
        Error.apply(this, arguments)
        this.name = 'ApplicationError'
        this.type = type
        this.message = type || 'unknown-error'

        ;(global.ga || angular.noop)('send', 'exception', {
          exDescription: this.message,
          exFatal: panic
        })

        $log.error('ApplicationError - %s', type)

        if (panic) {
          $location.url('/error/' + type)
        }
        $timeout(angular.noop)
      }
      ApplicationError.prototype = _.create(Error.prototype, {
        constructor: ApplicationError
      })
      return ApplicationError
    }
  ])
})(this)
