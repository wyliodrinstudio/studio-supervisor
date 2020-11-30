
"use strict";

var board = {
	'raspberrypi':
	{
		linux:
		{
			serial: '/dev/ttyS0',
			firmware: '/Arduino/src/Arduino.ino',
			firmware_makefile: '',
			nettype: 'iwconfig',
			shell: 'bash',
			avahi: 'publish',
			capabilities: { 'nodejs': true, 'python': true, 'visual': true, 'shell': true, 'csharp': true }
		},
		windows:
		{
			serial: '/dev/ttyAMA0',
			firmware: '\\Arduino\\src\\Arduino.ino',
			firmware_makefile: '',
			nettype: '',
			shell: 'powershell.exe',
			avahi: 'publish',
			capabilities: { 'nodejs': true, 'visual': true, 'powershell': true }
		}
	},
	'picopi':
	{
		linux:
		{
			firmware: '/Arduino/src/Arduino.ino',
			firmware_makefile: '',
			nettype: 'iwconfig',
			shell: 'bash',
			avahi: 'publish',
			capabilities: { 'nodejs': true, 'python': true, 'visual': true, 'shell': true, 'csharp': true }
		}
	},
	'beagleboneblack':
	{
		serial: '/dev/ttyGS0',
		firmware: '',
		firmware_makefile: '',
		nettype: 'iwconfig',
		shell: 'bash',
		avahi: 'publish',
		capabilities: { 'nodejs': true, 'python': true, 'visual': true, 'shell': true, 'csharp': true, 'streams': true }
	},
	'tockos':
	{
		linux:
		{
			signals:'udp',
			nettype:'iwconfig',
			shell:'bash',
			avahi:'publish',
			capabilities: {'c':true, 'rust': true}
		},
	},
	'udooneo':
	{
		serial: '/dev/ttyGS0',
		firmware: '/Arduino/Arduino.ino',
		firmware_makefile: '',
		nettype: 'nm',
		shell: 'bash',
		avahi: 'publish',
		capabilities: { 'nodejs': true, 'python': true, 'visual': true, 'shell': true, 'csharp': true, 'streams': true }
	},
	'arduinoyun':
	{
		serial: null,
		firmware: '/Arduino/Arduino.ino',
		firmware_makefile: '',
		nettype: 'iwconfig',
		shell: 'sh',
		avahi: 'restart',
		capabilities: { 'nodejs': true, 'python': true, 'visual': true, 'shell': true, 'streams': true }
	},
	'dragonboard':
	{
		windows:
		{
			serial: '/dev/ttyAMA0',
			firmware: '',
			firmware_makefile: '',
			nettype: '',
			shell: 'powershell.exe',
			avahi: 'publish',
			capabilities: { 'nodejs': true, 'visual': true, 'powershell': true }
		}
	},
};

module.exports = board;
