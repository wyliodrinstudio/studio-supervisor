
"use strict";

var uplink = require ('./uplink');
var debug = require ('debug')('wylidorin:app:server:deployments');
var child_process = require ('child_process');
var settings = require ('./settings');
var _ = require ('lodash');
var Docker =  require('dockerode');

console.log ('deploy');

var deployments = null;

var docker = new Docker();

debug ('Registering for tag dep');

function listofcontainers(containers)
{
	let containerstosend = [];

	for (let container of containers)
	{
		containerstosend.push({
			name: container.Names[0],
			ID: container.Id,
			image: container.Image,
			// command: container.Command,
			// state: container.State,
			status: container.Status
		})

	} 
	return containerstosend;
	
}
uplink.tags.on ('dep', function (c)
{
	if (c.a === 'run')
	{
		if (deployments === null)
		{
			docker.listContainers({all: true}, function(err, containers) {
				
				uplink.send('dep', listofcontainers(containers));
				//console.log('ALL: ' + containers.length);
			});

			var s = 5000;
			if(_.isNumber(c.s)) s = c.s*1000;

			deployments = setInterval(function()
			{
				docker.listContainers({all: true}, function(err, containers) {
					uplink.send('dep', listofcontainers(containers));
				});

			},s)
			
           
		}
	}
	else
	if (c.a === 'exit')
	{
		docker.getContainer(c.ID).stop(cb);
	}
	else
	if (c.a === 'stop')
	{
		if (deployments !== null)
		{
			clearInterval (deployments);
			deployments = null;
		}
	}
});
