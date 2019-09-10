
"use strict";

var fs = require ('fs');
var util = require ('../../util.js');
var board = require ('./board.js');
var debug = require ('debug')('wyliodrin:app:server:settings');
var os = require ('os');
var version = 0;
try
{
	version = require ('../../../package.json').version;
}
catch (e)
{
	version = require ('../../package.json').version;
}

console.log ('Loading settings library');

debug ('Reading name');

var boardname = os.hostname();

try
{
	boardname = fs.readFileSync ('/wyliodrin/boardname').toString ();
}
catch (exception)
{
	
}

debug ('Loading settings from /etc/wyliodrin/settings.json');

debug ('Reading board type');
var boardtype = process.argv[2];

var SETTINGS = require ('./'+boardtype+'-settings.json');

debug ('Board type '+boardtype);
if (!boardtype)
{
	console.log ('Unknown board type');
	process.exit (-10);
}

if (board[boardtype].linux || board[boardtype].windows)
{
	if (util.isWindows())
	{
		board[boardtype] = board[boardtype].windows;
	}
	else
	{
		board[boardtype] = board[boardtype].linux;
	}
}

var env = {
	HOME: (util.isWindows()?'c:\\wyliodrin':'/wyliodrin'),
	wyliodrin_board: boardtype,
	wyliodrin_version: version
};

var CONFIG_FILE = {};

try
{
	CONFIG_FILE = require (SETTINGS.CONFIG_FILE);
}
catch (e)
{
	debug ('wyliodrin.json missing, standard setup');
	CONFIG_FILE.jid = '';
}

module.exports.board = board[boardtype];
module.exports.boardtype = boardtype;
module.exports.env = env;
module.exports.CONFIG_FILE = CONFIG_FILE;
module.exports.SETTINGS = SETTINGS;
module.exports.boardname = boardname;
