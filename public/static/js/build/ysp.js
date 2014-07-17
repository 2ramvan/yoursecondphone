!function(){"use strict";angular.module("ysp-controllers",["ngSanitize","Scope.safeApply"]).controller("ErrorCtrl",["$log","$scope","$routeParams","peer_server_port",function(a,b,c,d){function e(a){return"Your Second Phone is unable to communicate with the server. Make sure that your firewall isn't blocking access to port "+d+". These are important to Your Second Phone working. Or the server could be down, if this error keeps happening even after you check your firewall, please report it to <a href='https://twitter.com/home?status=@yoursecondphone%20I'm%20getting%20a%20%22"+a+"%22.%20Please%20help!' target='_blank'>@yoursecondphone</a>"}var f={"no-webcam":"Your Second Phone was denied access to the webcam!","server-error":e("server-error"),"browser-incompatible":'Your browser is not capable of making video calls, please use the latest version of <a target="_blank" href="https://www.google.com/chrome">Google Chrome</a>, <a target="_blank" href="https://www.mozilla.org/firefox">Firefox</a> or <a target="_blank" href="http://www.opera.com/">Opera</a>',"ssl-unavailable":"An error was encountered while attempting to establish a secure connection with the server.","socket-error":e("socket-error"),"socket-io-error":e("socket-io-error")};b.error_id=c.err_type,b.error_description=f[b.error_id]||"An unknown error has occured."}]).controller("RootCtrl",["$log","$scope","GumService","$random","$location","supportsRealTimeCommunication","coordinator","$timeout",function(a,b,c,d,e,f,g,h){b.current_step=0,b.current_step=f()?1:-1,b.room_name="",b.valid_room_name=!0,b.$watch("room_name",function(a){return""===a?void(b.valid_room_name=!0):void(b.valid_room_name=a.match(/^\w(\w|-){1,30}$/))}),b.loading_gum=!1,b.initGum=function(){b.loading_gum=!0,c.once("active",function(){b.current_step+=1,b.$safeApply()}),c.invoke()},b.loading_room=!1,b.error_message="",b.launchRoom=function(){b.loading_room=!0,a.debug("Launching room... %s",b.room_name),b.valid_room_name&&""!=b.room_name||(b.room_name=d.string(10)),g.room_exists(b.room_name,function(a){b.loading_room=!1,a?(b.error_message="Sorry, that room name is already taken.",b.$safeApply(),h(function(){b.error_message=""},5e3)):(e.path("/"+b.room_name),b.$safeApply())})}}]).controller("RoomCtrl",["$log","$scope","GumService","$location","$routeParams","coordinator","ApplicationError","PeerWrapper","peer","fullscreen","$random","$rootScope","supportsRealTimeCommunication",function(a,b,c,d,e,f,g,h,i,j,k,l,m){function n(a){b.messages.push(a),l.$broadcast("ysp:message")}return m()?(b.room_id=e.room_id,b.room_link="http://ysp.im/#/"+e.room_id,b.peers=[],b.messages=[],b.draft="",b.showMessages=!0,b.isFullscreen=!1,b.getNumPeers=function(){var a=["zero","one","two"];return a[b.peers.length]},b.getColumnSize=function(){var a=["large-12","large-12","large-6"];return a[b.peers.length]},b.goFullscreen=function(){j.request(document.querySelector("div#all-streams")),b.$safeApply()},b.sendMessage=function(){b.draft&&b.peers.length&&async.each(b.peers,function(a,c){a.send("message",b.draft),c(null)},function(){n({from:i.id,content:b.draft,time_received:new Date}),b.draft="",a.debug("Message sent!")})},$(document).on(j.raw.fullscreenchange,function(){b.$safeApply()}),l.$on("$routeChangeStart",function(){f.leave_room(e.room_id),f.removeAllListeners(),$(document).off(j.raw.fullscreenchange)}),b.$watch(function(){return j.isFullscreen},function(a){b.isFullscreen=a}),void async.waterfall([function(a){async.parallel([function(a){return c.isInvoked()?a(null):(c.once("active",function(){return a(null)}),void c.invoke())},function(a){f.isReady()?a(null):f.once("ready",function(){a(null)})}],function(){a(null)})},function(a){f.join_room(b.room_id,a)}],function(c,d){function e(c){do c.color_code=m[k.integer(4)];while(_.contains(o,c.color_code));o.push(c.color_code),c.once("close",function(d){var e=o.indexOf(c.color_code);o.splice(e,1),a.debug("peer(%s) closed, pruning...",d),b.peers=b.peers.filter(function(a){return a.id!=d}),b.$safeApply()}),c.on("message",function(a){var d={};d.color_code=c.color_code,d.content=a,d.time_received=new Date,d.from=c.id,n(d),b.showMessages=!0,b.$safeApply()}),b.peers.push(c),b.$safeApply()}if(c)return new g(c);var j={},l={};i.on("call",function(b){if(l.hasOwnProperty(b.peer)){a.debug("mc(%s) arrived!",b.peer);var c=l[b.peer];delete l[b.peer];var d=h.forgeFromConnections(c,b);e(d)}else a.debug("mc(%s) received before dc, waiting...",b.peer),j[b.peer]=b}),i.on("connection",function(b){if(j.hasOwnProperty(b.peer)){a.debug("dc(%s) arrived!",b.peer);var c=j[b.peer];delete j[b.peer];var d=h.forgeFromConnections(b,c);e(d)}else a.debug("dc(%s) received before mc, waiting...",b.peer),l[b.peer]=b});var m=["green","blue","purple","orange","red"],o=[];f.on("peer_left",function(a){b.peers.forEach(function(b,c,d){b.id==a&&(b.close(),d.splice(c,1))})}),f.on("reconnect",function(){f.join_room(b.room_id)}),d.forEach(function(a){var b=new h(a);e(b)})})):new g("browser-incompatible",!0)}])}(this),function(){"use strict";angular.module("ysp-directives",[]).directive("pinToBottom",["$log","$rootScope","$timeout",function(a,b,c){return{restrict:"C",link:function(a,d){d=d[0],b.$on("ysp:message",function(){c(function(){$(d).scrollTop(d.scrollHeight+200)},75)})}}}]).directive("peer",["$log",function(){return{restrict:"E",scope:{peer:"=info"},link:function(a,b){var c=b.children()[0];a.peer.ms?attachMediaStream(c,a.peer.ms):a.peer.once("stream",function(){attachMediaStream(c,a.peer.ms)})},template:"<video autoplay class='peer_window'></video><div class='peer_color' ng-class='peer.color_code'></div>"}}]).directive("mirror",["$log","GumService",function(a,b){return{restrict:"E",link:function(a,c){var d=c.children()[0];b.isInvoked()&&attachMediaStream(d,b.getMediaStream()),b.on("active",function(a){attachMediaStream(d,a),$(c).removeClass("inactive")}),b.on("inactive",function(){$(c).addClass("inactive")})},template:"<video autoplay id='mirror' muted='muted'></video><div class='cf'></div>"}}])}(this),function(a){"use strict";angular.module("ysp",["ysp-services","ysp-controllers","ysp-directives","ngRoute","ngSanitize","Scope.safeApply"]).constant("main_host","yoursecondphone.co").constant("peer_server_port",8080).value("fullscreen",screenfull).config(["$logProvider",function(a){a.debugEnabled(!1)}]).config(["$routeProvider",function(a){a.when("/",{controller:"RootCtrl",templateUrl:"/static/views/root.html"}),a.when("/error/:err_type",{controller:"ErrorCtrl",templateUrl:"/static/views/error.html"}),a.when("/:room_id",{controller:"RoomCtrl",templateUrl:"/static/views/room.html"}),a.otherwise({redirectTo:"/"})}]).run(["$log","peer","coordinator","ApplicationError",function(a,b,c){b.open?c.advertise_peer_id():b.once("open",function(){c.advertise_peer_id()})}]).factory("ApplicationError",["$log","$location","$rootScope",function(b,c,d){function e(f,g){return!this instanceof e?new e(f,g):(g||(g=!1),Error.apply(this,arguments),this.name="ApplicationError",this.type=f,this.message=f||"unknown-error",(a.ga||angular.noop)("send","exception",{exDescription:this.message,exFatal:g}),b.error("ApplicationError - %s",f),g&&c.url("/error/"+f),void d.$safeApply())}return e.prototype=new Error,e.prototype.constructor=e,e}])}(this),function(a){"use strict";angular.module("ysp-services",[]).service("supportsRealTimeCommunication",["$log",function(){return function(){return a.util.supports.audioVideo&&a.util.supports.data?!0:!1}}]).service("peer",["$log","main_host","peer_server_port","ApplicationError",function(a,b,c,d){var e=new Peer({host:b,port:c,path:"/peers",secure:!0});return e.on("open",function(b){a.debug("peer: main peer connection open (%s)",b)}),e.on("close",function(){a.debug("peer: main peer connection closed")}),e.on("error",function(b){a.error("peer: %s",b.type,b);var c={"browser-incompatible":!1,"invalid-id":!1,"invalid-key":!1,"unavailable-id":!1,"ssl-unavailable":!0,"server-disconnected":!1,"server-error":!0,"socket-error":!0,"socket-closed":!0};return new d(b.type,c[b.type]||!1)}),e.on("connection",function(){a.debug("peer: incoming connection")}),e.on("call",function(){a.debug("peer: incoming call")}),e}]).service("_socket",["$log","main_host","ApplicationError",function(b,c,d){var e=io.connect("https://"+c,{path:"/coordinator"});return e.on("error",function(){return new d("socket-io-error",!0)}),e.on("disconnect",function(){b.debug("[_socket] - disconnected!")}),e.on("reconnect",function(){b.debug("[_socket] - reconnected!")}),a.skt=e,e}]).factory("coordinator",["$log","_socket","ApplicationError","peer",function(a,b,c,d){function e(a,c){b.emit("room_exists",a,c||angular.noop)}function f(e){a.debug("coordinator: advertising peer_id to coordinator...");var f=function(b){return b?new c(b,!0):(a.debug("coordinator: peer_id successfully advertised..."),j=!0,k.emit("ready"),void(e||angular.noop)())};b.connected?b.emit("peer_id",d.id,f):b.once("connect",function(){b.emit("peer_id",d.id,f)})}function g(c,d){if(!j)throw new Error("Must publish peer_id before joining room");b.emit("join_room",c,function(b,e){k.emit("join"),a.debug("coordinator: joined room (%s)",c),(d||angular.noop).call(this,b,e)})}function h(a){j&&b.emit("leave_room",a)}function i(){return j}var j=!1,k=new EventEmitter;return b.on("peer_left",function(a){k.emit("peer_left",a)}),b.on("disconnect",function(){j=!1}),b.on("reconnect",function(){f(function(){k.emit("reconnect")})}),k.room_exists=e,k.advertise_peer_id=f,k.join_room=g,k.leave_room=h,k.isReady=i,k}]).factory("PeerWrapper",["$log","peer","GumService","$random","$interval","$timeout",function(a,b,c,d,e,f){function g(d,e,f){var g=this,h=0;this.id=d,this.waiting_cbs={},this.dc=e||b.connect(d),this.mc=f||b.call(d,c.getMediaStream()),this.ms=null,this.mc.on("stream",function(b){a.debug("peer-mc(%s) 'stream' event",g.id),g.ms=b,g.emit("stream",b)}),this.mc.on("error",function(b){a.error("peer-mc(%s) error: ",g.id,b),g.emit("error-mc",b)}),this.dc.on("data",function(a){if(h=0,"object"==typeof a){if("event"==a.type){if(a.cb_id)var b=function(){var b={type:"cb",cb_id:a.cb_id},c=Array.prototype.slice.call(arguments);b.args=c,g.dc.send(b)};var c=a.args||[];c.push(b||angular.noop),c.unshift(a.event_name),g.emit.apply(g,c)}"cb"==a.type&&((g.waiting_cbs[a.cb_id]||angular.noop).apply(g,a.args),delete g.waiting_cbs[a.cb_id]),"heartbeat"==a.type&&g.dc.send({type:"heartbeat_reply",hb_id:a.hb_id}),"message"==a.type&&g.emit("message",a.content)}g.emit("data",a)}),this.dc.on("open",function(){a.debug("peer-dc(%s) open",g.id),g.emit("open")}),this.dc.on("close",function(){a.debug("peer-dc(%s) close",g.id),g.emit("close",g.id)}),this.dc.on("error",function(b){h+=1,a.error("peer-dc(%s)",g.id),g.emit("error-dc",b),h>10&&g.close()})}var h={event:function(){var a={},b=Array.prototype.slice.call(arguments);if(a.type="event",a.event_name=b.shift(),"function"==typeof b[b.length-1]){var c=b.pop(),e=d.string(20);this.waiting_cbs[e]=c,a.cb_id=e}a.args=b,this.dc.send(a)},message:function(a){var b={};b.type="message",b.content=a,this.dc.send(b)}};return g.prototype=_.clone(EventEmitter.prototype),g.forgeFromConnections=function(a,b){return b.answer(c.getMediaStream()),new g(a.peer,a,b)},g.prototype.send=function(){var a=this,b=Array.prototype.slice.call(arguments),c=b.shift();if(!h[c])throw new Error("Invalid Sender!");h[c].apply(a,b)},g.prototype.close=_.once(function(){var b=this;a.debug("close called..."),this.mc.close(),this.dc.close(),this.emit("close",this.id),f(function(){b.removeAllListeners(),b.dc.removeAllListeners(),b.mc.removeAllListeners()},500)}),g}]).service("GumService",["$log","$rootScope","ApplicationError",function(a,b,c){function d(){}var e=null,f=!1;d.prototype=_.clone(EventEmitter.prototype),d.prototype.invoke=function(){var a=this;if(!_.isFunction(getUserMedia))return new c("browser-incompatible");if(e&&f)throw new Error("Gum already invoked!");getUserMedia({video:!0,audio:!0},function(b){e=b,f=!0,a.emit("active",e)},function(b){f=!1,a.emit("error",b)})},d.prototype.revoke=function(){e&&e.stop(),f=!1,self.emit("inactive")},d.prototype.getMediaStream=function(){return e},d.prototype.isInvoked=function(a){return(a||angular.noop).call(this,null,f),f};var g=new d;return g.on("error",function(){return new c("no-webcam",!0)}),g}]).service("$random",["$log",function(){function a(a){a=a||15;for(var b=[],c="abcdefghijklmnopqrstuvwxyz0123456789",d=0;a>d;d++)b.push(c.charAt(Math.round(Math.random()*c.length)));return b.join("")}function b(a,b){return a=a||1,b=b||0,Math.round(Math.random()*(a-b)+b)}this.string=a,this.integer=b}])}(this);