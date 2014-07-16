(function(global) {
  'use strict';

  angular.module('ysp', ['ysp-services', 'ysp-controllers', 'ysp-directives', 'ngRoute', 'ngSanitize', 'Scope.safeApply'])

  .constant('main_host', 'yoursecondphone.co')

  .constant('peer_server_port', 8080)

  .value('fullscreen', screenfull)

  .config(['$logProvider',
    function($logProvider) {
      $logProvider.debugEnabled(false);
    }
  ])

  .config(['$routeProvider',
    function($routeProvider) {

      $routeProvider.when('/', {
        controller: 'RootCtrl',
        templateUrl: '/static/views/root.html'
      });

      $routeProvider.when('/error/:err_type', {
        controller: 'ErrorCtrl',
        templateUrl: '/static/views/error.html'
      });

      $routeProvider.when('/:room_id', {
        controller: 'RoomCtrl',
        templateUrl: '/static/views/room.html'
      });

      $routeProvider.otherwise({
        redirectTo: '/'
      });

    }
  ])

  .run(["$log", "peer", "coordinator", "ApplicationError",
    function($log, peer, coordinator, ApplicationError) {
      if (peer.open) {
        coordinator.advertise_peer_id();
      } else {
        peer.once("open", function(id) {
          coordinator.advertise_peer_id();
        });
      }
    }
  ])

  .factory("ApplicationError", ["$log", "$location", "$rootScope",
    function($log, $location, $rootScope) {

      function ApplicationError(type, panic) {
        if (!this instanceof ApplicationError) return new ApplicationError(type, panic);

        if (!panic)
          panic = false;

        Error.apply(this, arguments);
        this.name = "ApplicationError";
        this.type = type;
        this.message = type || "unknown-error";

        (global.ga || angular.noop)("send", "exception", {
          exDescription: this.message,
          exFatal: panic
        });

        $log.error("ApplicationError - %s", type);

        if (panic) {
          $location.url("/error/" + type);
        }
        $rootScope.$safeApply();
      }
      ApplicationError.prototype = new Error();
      ApplicationError.prototype.constructor = ApplicationError;

      return ApplicationError;
    }
  ]);

})(this);