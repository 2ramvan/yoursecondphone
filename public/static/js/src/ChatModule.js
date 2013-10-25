define(['src/BaseModule', 'src/BaseException', 'socket', 'notice', 'src/MessageClass'],
	function(BaseModule, BaseException, socket, notice, Message) {
		var chat, room, cb;

		var ChatModule = BaseModule.subclass({
			module_id: 'ChatModule',
			watchFor: [13201, 13202],
			constructor: function(callback) {
				this.init();
				cb = callback;

				chat = io.connect('https://chat.ysp.im:1337')
					.on('connect', this.onConnect)
					.on('msg', this.onMsg)
					.on('error', this.onError)
					.on('connect_failed', this.connectFailed)
					.on('disconnect', this.disconnect)
					.on('reconnect', this.reconnect);
			},
			onConnect: function() {
				cb(null); //Call the YSPController passed callback
				room = base.sid;
				var mod_root = base.chatModule;
				mod_root.debug('Successfully connected to chat server; joining session chat room...');
				chat.emit('join', room);
			},
			send: (function(msg) {
				base.chatModule.debug('Sent message: {1}'.assign(msg));
				chat.emit('msg', {
					room: room,
					msg: msg
				});
				base.viewModule.publishMessage(new Message('sent', msg));
			}).debounce(200),
			onMsg: function(msg) {
				base.chatModule.debug('Received message: {1}'.assign(msg));
				base.viewModule.publishMessage(new Message('received', msg));
			},
			onError: function() {
				cb(null);
				var mod_root = base.chatModule;
				mod_root.error(new BaseException(13201));
			},
			connectFailed: function() {
				cb(null);
				var mod_root = base.chatModule;
				mod_root.error(new BaseException(13202));
			},
			disconnect: function() {
				base.chatModule.debug('Lost connection to chat server; attempting to reconnect...');
				new notice(ysp_lang.ui.socket_disconnect, {
					type: 'error'
				});
			},
			reconnect: function() {
				base.chatModule.debug('Connecting to chat server was reconnected!');
				new notice(ysp_lang.ui.socket_reconnect, {
					type: 'success'
				});
			},
			handleError: function(exception) {
				base.viewModule.set('chat_available', false);
				new notice(exception.message, {type:"error"});
			}
		});

		return ChatModule;
	});