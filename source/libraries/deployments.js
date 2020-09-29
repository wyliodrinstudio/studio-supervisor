
'use strict';

var uplink = require ('./uplink');
var debug = require ('debug')('wylidorin:app:server:deployments');

var _ = require ('lodash');
var Docker =  require('dockerode');
var deployments = null;
var docker = new Docker();
debug ('Registering for tag dep');

function listofcontainers(containers)
{
	let containerstosend = [];
	let title = null;

	for (let container of containers)
	{
		for(let label in container.Labels)
		{
			if(label.substring(0,6) === 'studio')
			{
				title = container.Labels.studio;
			}
			else{
				title = container.Names[0].substring(1);
			}
		}

		containerstosend.push({
			name: container.Names[0].substring(1),
			ID: container.Id,
			image: container.Image,
			title:title,
			state: container.State,
			status: container.Status
		});

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
			});

			var s = 5000;
			if(_.isNumber(c.s)) s = c.s*1000;

			deployments = setInterval(function()
			{
				docker.listContainers({all: true}, function(err, containers) {
					uplink.send('dep', listofcontainers(containers));
				});

			},s);
		}
	}
	else
	if (c.a === 'exit')
	{
		docker.getContainer(c.ID).stop();
	}
	else
	if(c.a === 'delete')
	{
		docker.getContainer(c.ID).remove();
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