define(['Ractive', 'rv!/static/templates/view.html', 'src/MessageClass'], function(Ractive, template, Message) {
	var ViewModule = Ractive.extend({
		module_id: "ViewModule",
		el: document.getElementById('page_content'),
		template: template,
		data: {
			sid: 'Loading...',
			session_link: 'Loading...',
			fatalError: false,
			fatal_error_message: 'Unknown Error!',
			messages: [],
			chat_available: true,
			lang_chat_unavailable: ""
		},
		init: function(callback) {
			this.dbug('coming online...');

			//Grab the lang string upon 'ViewModule' being instantiated by MainModule.
			this.set('lang_chat_unavailable', ysp_lang.ui.chat_unavailable);

			callback(null);
		},
		publishMessage: function(msg) {
			this.dbug('Publishing message to view...');
			if (msg instanceof Message) {
				this.data.messages.push(msg);
				var chatbox = document.getElementById('chat');
				chatbox.scrollTop = chatbox.scrollHeight;
			} else {
				log.warn("{1} - {2}: {3}".assign(Date.create().format(base.timestamp_fmt), this.module_id, "publishMessage didn't receive a 'Message' object"));
			}
		},
		dbug: function() {
			var stamp = "{1} - {2}: ".assign(Date.create().format(base.timestamp_fmt), this.module_id);
			var args = Array.prototype.slice.call(arguments);
			args.unshift(stamp);
			log.debug.apply(null, args);
		},
		input_activity: function(event) {
			if (event.original.which === 13) {
				this.dbug('Enter key pressed; sending message...');
				var msg = event.node.value;

				if (msg === "") {
					this.dbug("Empty input...");
				} else {
					//Send a message
					base.chatModule.send(msg);

					//Reset input
					event.node.value = "";
				}
			}
		},
		session_link_hover: function(event) {
			var el = event.node;
			el.focus();
			var win = window;
			var doc = win.document,
				sel, range;
			if (win.getSelection && doc.createRange) {
				sel = win.getSelection();
				range = doc.createRange();
				range.selectNodeContents(el);
				sel.removeAllRanges();
				sel.addRange(range);
			} else if (doc.body.createTextRange) {
				range = doc.body.createTextRange();
				range.moveToElementText(el);
				range.select();
			}
		}
	});

	return ViewModule;
});