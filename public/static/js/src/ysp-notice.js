(function(global){
	'use strict';
	
	angular.module("ysp-notice", ["btford.socket-io"])

	.directive("toaster", ["$log", function($log) {
		return {
			restrict: "C",

		}
	}])

})(this);