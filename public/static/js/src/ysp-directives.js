(function (global) {
  'use strict'

  /*
  global $
  global angular
  global attachMediaStream
   */

  angular.module('ysp-directives', [])

  .directive('pinToBottom', ['$log', '$rootScope', '$timeout', function($log, $rootScope, $timeout) {
    return {
      restrict: 'C',
      link: function(scope, element, attrs) {
        element = element[0]
        $rootScope.$on('ysp:message', function(event) {
          $timeout(function() {
            $(element).scrollTop(element.scrollHeight + 200)
          }, 75)
        })
      }
    }
  }])

  .directive('peer', ['$log', function($log) {
    return {
      restrict: 'E',
      scope: {
        peer: '=info'
      },
      link: function(scope, element, attrs) {
        var video_window = element.children()[0]

        if (scope.peer.ms) {
          attachMediaStream(video_window, scope.peer.ms)
        } else {
          scope.peer.once('stream', function() {
            attachMediaStream(video_window, scope.peer.ms)
          })
        }
      },
      template: "<video autoplay class='peer-window'></video><div class='peer-color' ng-class='peer.color_code'></div>"
    }
  }])

  .directive('mirror', ['$log', 'GumService', function($log, GumService) {
    return {
      restrict: 'E',
      link: function(scope, element, attrs) {
        var video_window = element.children()[0]

        if (GumService.getMediaStream()) {
          attachMediaStream(video_window, GumService.getMediaStream())
        } else {
          GumService.invoke()
        }

        scope.$watch(function() {
          return GumService.getMediaStream()
        }, function(ms) {
          if (ms) {
            attachMediaStream(video_window, ms)
            $(element).removeClass('inactive')
          } else {
            $(element).addClass('inactive')
          }
        })
      },
      template: "<video autoplay id='mirror' muted='muted'></video><div class='cf'></div>"
    }
  }])
})(this)
