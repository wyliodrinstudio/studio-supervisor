'use strict';

var util = require ('../util.js');
var gadget = require ('./gadget');
var bonjour = require ('./bonjour');

var _ = require ('lodash');

var debug = require ('debug')('wylidorin:app:server:peripherals');

var LIST_PERIPHERALS = 3000;

var serialPorts = [];
var peripherals = [];

/* eslint-disable-next-line no-console */
console.log ('Loading peripherals library');

var serialport = util.load ('serialport');
function listPeripherals()
{
	// TODO a better way
	serialport.list (function (err, ports)
	{
		if (ports.length !== serialPorts.length)
		{
			serialPorts = ports;
			peripherals = [];
			_.each (serialPorts, function (peripheral)
			{
				if (peripheral.vendorId && peripheral.productId)
				{
					peripherals.push ({
						p: peripheral.comName,
						s: peripheral.serialNumber,
						vid: peripheral.vendorId,
						pid: peripheral.productId
					});
				}
			});
			gadget.status ();
			bonjour.publish ();
		}
		setTimeout (listPeripherals, LIST_PERIPHERALS);
	});
}

function getPeripherals ()
{
	return peripherals;
}

debug ('Looking for peripherals every '+LIST_PERIPHERALS+' ms');
if(serialport){
	listPeripherals ();
}


module.exports.getPeripherals = getPeripherals;
