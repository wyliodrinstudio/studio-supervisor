
'use strict';

var util = require ('../util.js');
var debug = require ('debug')('wyliodrin:app:server:uplink');
var serialport = util.load ('serialport');
var msgpack = require ('msgpack5')();
var EventEmitter = require ('events').EventEmitter;
var bonjour = require ('./bonjour');
var settings = require ('./settings');
var CONFIG_FILE = settings.CONFIG_FILE;
var board = settings.board;
var SETTINGS = settings.SETTINGS;
var _ = require ('lodash');
var pam = util.load ('authenticate-pam');
var gadget = require ('./gadget');
var net = require ('net');
var WebSocket = require ('ws');
var fs = require ('fs');
var crypto = require('crypto');

var ws = null;

let id = null;
let websocketServer = null;
let token = null;
let keepalive = null;
let reconnectTime = 500;


try
{
	let config_file = null;
	if (process.env.TOKEN) {
		config_file = JSON.parse (Buffer.from (process.env.TOKEN, 'base64').toString());
	}
	else
	{
		config_file = JSON.parse (fs.readFileSync (SETTINGS.config_file));
	}
	websocketServer = config_file.server;
	token = config_file.token;
	id = crypto.createHash('md5').update(config_file.id).digest('hex');
	settings.boardname = config_file.id;
}
catch (e)
{
	/* eslint-disable-next-line no-console */
	console.error ('Config file no available, websocket is disabled ('+e.message+')');
}

if (websocketServer && token && id) websocketConnect ();

function websocketConnect ()
{
	let socketError = null;
	debug ('WebSocket connect to '+websocketServer);
	if (!ws)
	{
		ws = new WebSocket(websocketServer);
		ws.on ('open', function (){
			if (!socket)
			{
				reset (SOCKET);
				debug ('Websocket connected');
				socketError = null;
				reconnectTime = 500;
				socket = {
					end: function ()
					{
						if (ws)
						{
							ws.close();
						}
						else 
						{
							/* eslint-disable-next-line no-console */
							console.error ('SOCKET_END socket is null');
						}
					},
					write: function (data, done)
					{
						if (ws)
						{	
							ws.send (JSON.stringify ({t:'p', d: data.toString ('base64')}));
							// process.nextTick (function ()
							// {
							// 	done ();
							// });
						}
						else {
							/* eslint-disable-next-line no-console */
							console.error ('SOCKET_WRITE socket is null');
						}
						process.nextTick (done);
					}
				};
				ws.send (JSON.stringify ({t: 'a', token: token, id: id, name: settings.boardname, board: settings.boardtype}));
			}
			else
			{
				ws.close ();
			}
		});
		ws.on ('message', function (m){
			if (!keepalive)
			{
				keepalive = setInterval (function ()
				{
					send ('ping', null);
				}, 10*1000);
			}
			try
			{
				let data = JSON.parse (m);
				if (data.t === 'a')
				{
					// TODO
				}
				else
				if (data.t === 'p')
				{
					let dat = Buffer.from (data.d, 'base64');
					for (let p of dat)
					{
						receivedDataPacket (p);
					}
				}
			}
			catch (e)
			{
				/* eslint-disable-next-line no-console */
				console.error ('WebSocket packet '+e.message);
			}
		});

		ws.on ('error', function (error)
		{
			if (!socketError)
			{
				/* eslint-disable-next-line no-console */
				console.error ('WebSocket '+error.message);
				socketError = error.message;
			}
			ws.close ();
		});
		ws.on ('close', function ()
		{
			if (!socketError)
			{
				debug ('Websocket closed');
			}
			// debug ('Socket disconnect');
			// login = false;
			// socket = null;
			clearInterval (keepalive);
			keepalive = null;
			socket = null;
			ws = null;
			let retry = function (){
				reconnectTime = reconnectTime * 2;
				if (reconnectTime > 5000) reconnectTime = 5000;
				if (!socket) websocketConnect ();
				else setTimeout (retry, reconnectTime);
			};
			setTimeout (retry, reconnectTime);
		});
	}

}

/* eslint-disable-next-line no-console */
console.log ('Loading uplink library');

var SOCKET = 1;
var SERIAL = 2;

var PACKET_SEPARATOR = 255;
var PACKET_ESCAPE = 0;
var BUFFER_PACKET_SEPARATOR = null;
var BUFFER_SIZE = 8192;

var SerialPort = null;
if (serialport)
{
	SerialPort = serialport;
}

function run ()
{
	PACKET_SEPARATOR = CONFIG_FILE.serialpacketseparator || PACKET_SEPARATOR;
	PACKET_ESCAPE = CONFIG_FILE.serialpacketseparator || PACKET_ESCAPE;
	BUFFER_PACKET_SEPARATOR = Buffer.from ([PACKET_SEPARATOR, PACKET_SEPARATOR]);
	BUFFER_SIZE = CONFIG_FILE.serialbuffersize || BUFFER_SIZE;
	try
	{
		if (board.serial !== null)
		{
			serial = new SerialPort (board.serial, {
				baudRate: CONFIG_FILE.serialbaudrate || 115200,
				autoOpen: false
			});

			serial.open (function (error)
			{
				debug ('open serial '+board.serial+ ' at '+(CONFIG_FILE.serialbaudrate || 115200));
				if (!error)
				{
					debug ('Serial connected');
					isConnected = true;
					send ('', null);
					send ('ping', null);
					gadget.status ();
					gadget.capabilities ();
				}
				else
				{
					/* eslint-disable-next-line no-console */
					console.error (error);
				}	
			});

			serial.on ('error', function (error)
			{
				debug ('Serial port error '+error);
			});

			serial.on ('data', function (data)
			{
				if (socket !== null) 
				{
					debug ('Serial data, socket');
					socket.end ();
					reset (SERIAL);
				}
				// console.log (data.length);
				// console.log (data.toString ());
				for (var pos = 0; pos < data.length; pos++)
				{
					// console.log (data[pos]);
					receivedDataPacket (data[pos]);
				}
			});
		}
	}
	catch (e)
	{
		debug ('Serial '+e);
	}

	if (serial !== null)
	{
		reset (SERIAL);
	}
	else
	{
		reset (SOCKET);
	}

	server = net.createServer (function (_socket)
	{
		if (!socket)
		{
			socket = _socket;
			if (util.isWindows ()) socket.setTimeout (12000);
			debug ('Socket connection');
			reset (SOCKET);
			socket.on ('data', function (data)
			{
				// console.log (data.length);
				for (var pos = 0; pos < data.length; pos++)
				{
					// console.log (data[pos]);
					receivedDataPacket (data[pos]);
				}
			});

			socket.on ('timeout', function ()
			{
				socket.destroy ();
				debug ('Socket timeout');
				login = false;
				socket = null;
			});

			socket.on ('error', function ()
			{
				debug ('Socket error '+socket);
				reset (SERIAL);
				login = false;
				socket = null;
			});

			socket.on ('end', function ()
			{
				reset (SERIAL);
				debug ('Socket disconnect');
				login = false;
				socket = null;
			});
		}
		else
		{
			/* eslint-disable-next-line no-console */
			console.error ('There is another connection already');
			var m = escape(msgpack.encode ({t:'e', d:{s: 'busy'}}));
			_socket.write ('', function (){});
			_socket.write (BUFFER_PACKET_SEPARATOR, function (){});
			_socket.write (m, function (){});
			_socket.write (BUFFER_PACKET_SEPARATOR, function (){});
			_socket.end ();
		}
	});

	module.exports.server = server;

	server.listen (7000, function (err)
	{
		if (err) {
			/* eslint-disable-next-line no-console */
			console.error ('Server error '+err.message);
		}
		bonjour.publish ();
	});
}

var server = null;

var packets = new EventEmitter ();
var tags = new EventEmitter ();

var socket = null;

var _send = null;

var sendQueue = [];
var sendLowPriorityQueue = [];

var serialSending = false;
var socketSending = false;

var isConnected = false;

var receivedFirstPacketSeparator = false;
var login = false;

var receivedData = Buffer.alloc (BUFFER_SIZE);
var receivedDataPosition = 0;
var previousByte = 0;

var serial = null;

function addToBuffer (data)
{
	// TODO put maximum limit
	// debug ('Adding '+data+' to receivedData');
	if (receivedDataPosition >= receivedData.length)
	{
		// TODO verify a maximum size
		debug ('Data size exceeded, enlarging data with '+receivedData.length);
		var r = receivedData;
		receivedData = Buffer.alloc (r.length*2);
		for (var pos=0; pos < r.length; pos++)
		{
			receivedData[pos] = r[pos];
		}
		receivedDataPosition = pos;
	}
	receivedData[receivedDataPosition] = data;
	receivedDataPosition=receivedDataPosition+1;
}

function packet ()
{
	debug ('Packet of size '+receivedDataPosition+' received');
	var data = receivedData.slice (0, receivedDataPosition);
	receivedDataPosition = 0;
	// console.log (data.length)
	var m;
	try
	{
		m = msgpack.decode (data);
	}
	catch (e)
	{
		/* eslint-disable-next-line no-console */
		console.error ('Received a packet with errors');
	}
	return m;
}

function escape (data)
{
	var l = 0;
	for (var i=0; i<data.length; i++)
	{
		if (data[i]===PACKET_SEPARATOR) l = l+2;
		else l = l+1;
	}
	if (l===data.length) return data;
	else
	{
		var dataserial = Buffer.alloc (l);
		var li=0;
		for (var ii=0; ii<data.length; ii++)
		{
			if (data[ii] === PACKET_SEPARATOR)
			{
				dataserial[li]=data[ii];
				li++;
				dataserial[li]=PACKET_ESCAPE;
				li++;
			}
			else
			{
				dataserial[li] = data[ii];
				li++;
			}
		}
		return dataserial;
	}
}

function reset (type)
{
	receivedFirstPacketSeparator = false;
	receivedDataPosition = 0;
	previousByte = 0;
	login = false;
	if (type === SERIAL)
	{
		_send = _serialSend;
	}
	else
	{
		_send = _socketSend;
	}
}

function receivedDataPacket (data)
{
	if (!receivedFirstPacketSeparator)
	{
		if (data === PACKET_SEPARATOR && previousByte === PACKET_SEPARATOR)
		{
			receivedFirstPacketSeparator = true;
			previousByte = 0;
		}
		else
		{
			debug ('Received random bytes');
			previousByte = data;
		}
	}
	else
	{
		// console.log (data);
		if (data === PACKET_SEPARATOR)
		{
			if (previousByte === PACKET_SEPARATOR)
			{
				var m = packet ();
				// console.log (m);
				if (!socket || login)
				{
					packets.emit ('message', m.t, m.d);
					debug ('Receive message with tag '+m.t);
					tags.emit (m.t, m.d);
				}
				else
				{
					if (m.t === 'login')
					{
						var username = m.d.username;
						var password = m.d.password;
						if (!username) username = '';
						if (!password) password = '';
						if (pam)
						{
							pam.authenticate (username, password, function (error)
							{
								if (!error) 
								{
									debug ('Login');
									login = true;
									send ('', null);
									gadget.status ();
									gadget.capabilities ();
									// sendVersion ();
								}
								else 
								{
									debug ('Login error');
									send ('', null);
									send ('e', {s: 'login'});
									socket.end ();
									login = false;
								}
							});
						}
						else
						{
							login = true;
							send ('', null);
							gadget.status ();
							gadget.capabilities ();
						}
					}
				}
				previousByte = 0;
			}
			else
			{
				previousByte = data;
			}
		}
		else
		if (data === PACKET_ESCAPE)
		{
			if (previousByte === PACKET_SEPARATOR)
			{
				debug ('escape found '+receivedDataPosition);
				addToBuffer (previousByte);
				previousByte = 0;
			}
			else
			{
				debug ('PACKET_ESCAPE found '+receivedDataPosition);
				addToBuffer (data);
				previousByte = data;
			}
		}
		else
		{
			if (previousByte === PACKET_SEPARATOR)
			{
				debug ('Random bytes');
			}
			addToBuffer(data);
			previousByte = data;
		}
	}
	
}

function sendLowPriority (tag, data)
{
	sendLowPriorityQueue.push ({t: tag, d: data});
	if (_.isFunction (_send))
	{
		_send ();
	}
}

function send (tag, data)
{
	// console.log (sendQueue);
	sendQueue.push ({t: tag, d: data});
	if (_.isFunction (_send))
	{
		_send ();
	}
}

function _serialSend ()
{
	if (serial !== null)
	{
		if (serialSending === false)
		{
			var message = null;
			if (sendQueue.length>0)
			{
				message = sendQueue[0];
				sendQueue.splice (0,1);
			}
			else if (sendLowPriorityQueue.length>0)
			{
				message = sendLowPriorityQueue[0];
				sendLowPriorityQueue.splice (0,1);
			}
			if (message)
			{
				debug ('Serial sending tag '+message.t+' data '+JSON.stringify (message.d));
				var m = escape(msgpack.encode (message));
				// console.log (msgpack.decode (new Buffer (m, 'base64')));
				// console.log (m.toString ());
				if (isConnected)
				{
					serialSending = true;
					serial.write (m, function (err/*, result*/)
					{
						if (!err)
						{
							debug ('Serial sent '+m.length+' bytes');
						}
						else 
						{
							debug ('Serial send error '+m);
							/* eslint-disable-next-line no-console */
							console.error (err);
						}
					});
					serial.write (BUFFER_PACKET_SEPARATOR, function (/* err, result */)
					{
						serialSending = false;
						_serialSend ();
						// console.log (err);
					});
				}
				else
				{
					debug ('Serial ignore packet');
					process.nextTick (function ()
					{
						_socketSend ();
					});
				}
			}
		}
		else
		{
			debug ('Serial already sending');
		}
	}
	else
	{
		debug ('Serial uninitialised');
	}
}

function _socketSend ()
{
	if (socketSending === false)
	{
		var message = null;
		if (sendQueue.length>0)
		{
			message = sendQueue[0];
			sendQueue.splice (0,1);
		}
		else if (sendLowPriorityQueue.length>0)
		{
			message = sendLowPriorityQueue[0];
			sendLowPriorityQueue.splice (0,1);
		}
		if (message)
		{
			debug ('Socket sending tag '+message.t+' data '+JSON.stringify (message.d));
			var m = escape(msgpack.encode (message));
			// console.log (msgpack.decode (new Buffer (m, 'base64')));
			// console.log (m.toString ());
			if (login)
			{
				socketSending = true;
				socket.write (m, function (err)
				{
					if (!err)
					{
						debug ('Socket sent '+m.length+' bytes');
					}
					else 
					{
						debug ('Socket send error '+m);
						/* eslint-disable-next-line no-console */
						console.error (err);
					}
				});
				socket.write (BUFFER_PACKET_SEPARATOR, function (/* err, result */)
				{
					socketSending = false;
					_socketSend ();
					// console.log (err);
				});
			}
			else
			{
				debug ('Socket ignore packet');
				process.nextTick (function ()
				{
					_socketSend ();
				});
			}
		}
	}
	else
	{
		debug ('Socket already sending');
	}
}

debug ('Registering for tag ping');
tags.on ('ping', function (/* p */)
{
	send ('pong', null);
});

debug ('Registering for tag d');
tags.on ('d', function (/* p */)
{
	if(socket !== null) socket.end ();
	reset (SERIAL);
});

module.exports.send = send;
module.exports.sendLowPriority = sendLowPriority;
module.exports.packets = packets;
module.exports.tags = tags;
module.exports.server = server;
module.exports.run = run;
module.exports.inUse = function inUse ()
{
	return websocketServer !== null || socket !== null;
};

