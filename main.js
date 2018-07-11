/**
 *
 * Moehlenhoff Alpha2 Adapter
 *
 *
 *  file io-package.json comments:
 *
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
const adapter = new utils.Adapter('alpha2');
const request = require('request');
const parser = require('xml2js').parseString;
const http = require('http');   

// define adapter wide vars
var device_id;

/*Variable declaration, since ES6 there are let to declare variables. Let has a more clearer definition where 
it is available then var.The variable is available inside a block and it's childs, but not outside. 
You can define the same variable name inside a child without produce a conflict with the variable of the parent block.*/
let variable = 1234;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    //adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
		adapter.log.info('Value: ' + state.val);
		
		// save value in var
		var new_temp = state.val;
		
		// Set HEATAREA Target Temperatures
		if (id == adapter.namespace + '.' + 'HEATAREA.0.T_TARGET') {		
		// Set values via XML
		var heatarea = '0';
		}
		if (id == adapter.namespace + '.' + 'HEATAREA.1.T_TARGET') {		
		// Set values via XML
		var heatarea = '1';
		}
		
			// Post DATA to DEVICE
			var data = '<?xml version="1.0" encoding="UTF-8"?> <Devices> <Device> <ID>'+ obj.Device.ID +'</ID> <HEATAREA nr="'+ heatarea +'"> <T_TARGET>'+ new_temp +'</T_TARGET> </HEATAREA> </Device> </Devices>';
			httpPost(data);
	}
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

// Post Data to XML-API
function httpPost(data) {
	
		// URL, die abgefragt, bzw. gesendet werden soll:
		var options = {
			host: '10.49.12.169',
			path: '/data/changes.xml',
			method: 'POST'                // in der Regel: "GET"
			};
	
    var req = http.request(options, function(res) {
    adapter.log.info("http Status: " + res.statusCode);
    adapter.log.info('HEADERS: ' + JSON.stringify(res.headers), (res.statusCode != 200 ? "warn" : "info")); // Header (Rückmeldung vom Webserver)
    });
    
    req.on('error', function(e) { // Fehler abfangen
        adapter.log.info('ERROR: ' + e.message,"warn");
    });

    adapter.log.info("Data to request body: " + data);
    // write data to request body
    (data ? req.write(data) : adapter.log.info("Daten: keine Daten angegeben"));
    req.end();
}

// Get XML Data from API
function getXMLcyclic() {
    request('http://10.49.12.169/data/static.xml', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            getTemp(body); 
            } else { 
        adapter.log.info("Fehler beim Herunterladen: " + error, 'error');
            }
            });
}
			
function getTemp(xml) {
    parser(xml, {explicitArray: false, mergeAttrs: true, explicitRoot: false}, function(err, obj) {
        if(err) adapter.log.info('Fehler XML-Parsen: ' + err, 'error');
        else {
            //adapter.log.info("XMLcyclic: " + JSON.stringify(obj));
                adapter.setState(adapter.namespace + '.' + 'DEVICE.ID', {val: obj.Device.ID, ack: true});
                adapter.setState(adapter.namespace + '.' + 'DEVICE.NAME', {val: obj.Device.NAME, ack: true});
                adapter.setState(adapter.namespace + '.' + 'DEVICE.TYPE', {val: obj.Device.TYPE, ack: true});
                adapter.setState(adapter.namespace + '.' + 'DEVICE.DATETIME', {val: obj.Device.DATETIME, ack: true});
                adapter.setState(adapter.namespace + '.' + 'DEVICE.TIMEZONE', {val: obj.Device.TIMEZONE, ack: true});
                adapter.setState(adapter.namespace + '.' + 'DEVICE.NTPSYNC', {val: Boolean(Number(obj.Device.NTPTIMESYNC)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'DEVICE.T_HEAT_VACATION', {val: parseFloat(obj.Device.T_HEAT_VACATION), ack: true});
                
                adapter.setState(adapter.namespace + '.' + 'VACATION.STATE', {val: Boolean(Number(obj.Device.VACATION.VACATION_STATE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'VACATION.START_DATE', {val: obj.Device.VACATION.START_DATE, ack: true});
                adapter.setState(adapter.namespace + '.' + 'VACATION.START_TIME', {val: obj.Device.VACATION.START_TIME, ack: true});
                adapter.setState(adapter.namespace + '.' + 'VACATION.END_DATE', {val: obj.Device.VACATION.END_DATE, ack: true});
                adapter.setState(adapter.namespace + '.' + 'VACATION.END_TIME', {val: obj.Device.VACATION.END_TIME, ack: true});
                
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.0.1.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[0].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.0.1.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[0].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.0.2.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[1].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.0.2.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[1].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.0.3.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[2].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.0.3.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[2].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.0.4.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[3].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.0.4.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[3].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.1.1.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[4].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.1.1.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[4].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.1.2.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[5].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.1.2.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[5].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.1.3.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[6].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.1.3.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[6].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.1.4.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[7].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.1.4.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[7].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.2.1.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[8].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.2.1.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[8].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.2.2.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[9].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.2.2.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[9].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.2.3.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[10].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.2.3.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[10].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.2.4.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[11].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.2.4.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[11].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.3.1.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[12].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.3.1.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[12].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.3.2.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[13].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.3.2.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[13].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.3.3.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[14].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.3.3.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[14].END, ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.3.4.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[15].START , ack: true});
                adapter.setState(adapter.namespace + '.' + 'PROGRAM.3.4.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[15].END, ack: true});
                
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.0.HEATAREA_NAME', {val: obj.Device.HEATAREA[0].HEATAREA_NAME, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.0.HEATAREA_MODE', {val: obj.Device.HEATAREA[0].HEATAREA_MODE, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.0.T_ACTUAL', {val: parseFloat(obj.Device.HEATAREA[0].T_ACTUAL), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.0.T_TARGET', {val: parseFloat(obj.Device.HEATAREA[0].T_TARGET), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.0.PROGRAM_WEEK', {val: obj.Device.HEATAREA[0].PROGRAM_WEEK, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.0.PROGRAM_WEEKEND', {val: obj.Device.HEATAREA[0].PROGRAM_WEEKEND, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.0.T_HEAT_DAY', {val: parseFloat(obj.Device.HEATAREA[0].T_HEAT_DAY), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.0.T_HEAT_NIGHT', {val: parseFloat(obj.Device.HEATAREA[0].T_HEAT_NIGHT), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.1.HEATAREA_NAME', {val: obj.Device.HEATAREA[1].HEATAREA_NAME, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.1.HEATAREA_MODE', {val: obj.Device.HEATAREA[1].HEATAREA_MODE, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.1.T_ACTUAL', {val: parseFloat(obj.Device.HEATAREA[1].T_ACTUAL), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.1.T_TARGET', {val: parseFloat(obj.Device.HEATAREA[1].T_TARGET), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.1.PROGRAM_WEEK', {val: obj.Device.HEATAREA[1].PROGRAM_WEEK, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.1.PROGRAM_WEEKEND', {val: obj.Device.HEATAREA[1].PROGRAM_WEEKEND, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.1.T_HEAT_DAY', {val: parseFloat(obj.Device.HEATAREA[1].T_HEAT_DAY), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.1.T_HEAT_NIGHT', {val: parseFloat(obj.Device.HEATAREA[1].T_HEAT_NIGHT), ack: true});
                
                //adapter.setState(adapter.namespace + '.' + 'HEATAREA.2.HEATAREA_NAME', {val: obj.Device.HEATAREA[2].HEATAREA_NAME, ack: true});
                //adapter.setState(adapter.namespace + '.' + 'HEATAREA.2.HEATAREA_MODE', {val: obj.Device.HEATAREA[2].HEATAREA_MODE, ack: true});
                //adapter.setState(adapter.namespace + '.' + 'HEATAREA.2.T_ACTUAL', {val: parseFloat(obj.Device.HEATAREA[2].T_ACTUAL), ack: true});
                //adapter.setState(adapter.namespace + '.' + 'HEATAREA.2.T_TARGET', {val: parseFloat(obj.Device.HEATAREA[2].T_TARGET), ack: true});
                //adapter.setState(adapter.namespace + '.' + 'HEATAREA.2.PROGRAM_WEEK', {val: obj.Device.HEATAREA[2].PROGRAM_WEEK, ack: true});
                //adapter.setState(adapter.namespace + '.' + 'HEATAREA.2.PROGRAM_WEEKEND', {val: obj.Device.HEATAREA[2].PROGRAM_WEEKEND, ack: true});
                //adapter.setState(adapter.namespace + '.' + 'HEATAREA.2.T_HEAT_DAY', {val: parseFloat(obj.Device.HEATAREA[2].T_HEAT_DAY), {val: true);
                //adapter.setState(adapter.namespace + '.' + 'HEATAREA.2.T_HEAT_NIGHT', {val: parseFloat(obj.Device.HEATAREA[2].T_HEAT_NIGHT), ack: true});
                
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.0.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[0].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.0.HEATAREA_NR', {val: obj.Device.HEATCTRL[0].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.0.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[0].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.0.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[0].HEATCTRL_STATE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.1.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[1].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.1.HEATAREA_NR', {val: obj.Device.HEATCTRL[1].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.1.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[1].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.1.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[1].HEATCTRL_STATE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.2.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[2].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.2.HEATAREA_NR', {val: obj.Device.HEATCTRL[2].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.2.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[2].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.2.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[2].HEATCTRL_STATE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.3.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[3].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.3.HEATAREA_NR', {val: obj.Device.HEATCTRL[3].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.3.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[3].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.3.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[3].HEATCTRL_STATE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.4.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[4].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.4.HEATAREA_NR', {val: obj.Device.HEATCTRL[4].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.4.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[4].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.4.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[4].HEATCTRL_STATE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.5.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[5].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.5.HEATAREA_NR', {val: obj.Device.HEATCTRL[5].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.5.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[5].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.5.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[5].HEATCTRL_STATE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.6.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[6].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.6.HEATAREA_NR', {val: obj.Device.HEATCTRL[6].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.6.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[6].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.6.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[6].HEATCTRL_STATE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.7.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[7].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.7.HEATAREA_NR', {val: obj.Device.HEATCTRL[7].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.7.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[7].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.7.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[7].HEATCTRL_STATE)), ack: true});
			   
			    // fill global vals
				
			   
        }
    });
	
}
		
function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('config test1: '    + adapter.config.test1);
    adapter.log.info('config test1: '    + adapter.config.test2);
    adapter.log.info('config mySelect: ' + adapter.config.mySelect);
	
	/*
	* Interval
	* example 
	* setInterval(pifaceread, adapter.config.piinterval);
	*/
	setInterval(getXMLcyclic, 30000);
	


    /**
     *
     *      For every state in the system there has to be also an object of type state
     *
     *      Here a simple template for a boolean variable named "testVariable"
     *
     *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
     *
     */

    adapter.setObject('DEVICE', {
        type: 'object',
        common: {
            name: 'DEVICE',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('DEVICE.ID', {
        type: 'state',
        common: {
            name: 'ID',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('DEVICE.NAME', {
        type: 'state',
        common: {
            name: 'NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('DEVICE.TYPE', {
        type: 'state',
        common: {
            name: 'TYPE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('DEVICE.DATETIME', {
        type: 'state',
        common: {
            name: 'DATE-TIME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('DEVICE.TIMEZONE', {
        type: 'state',
        common: {
            name: 'TIMEZONE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('DEVICE.NTPSYNC', {
        type: 'state',
        common: {
            name: 'NTPSYNC STATUS',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('DEVICE.T_HEAT_VACATION', {
        type: 'state',
        common: {
            name: 'VACATION_TEMP',
            type: 'number',
            unit: "°C",
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('VACATION', {
        type: 'object',
        common: {
            name: 'VACATION',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('VACATION.STATE', {
        type: 'state',
        common: {
            name: 'VACATION STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('VACATION.START_DATE', {
        type: 'state',
        common: {
            name: 'VACATION START DATE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('VACATION.START_TIME', {
        type: 'state',
        common: {
            name: 'VACATION START TIME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('VACATION.END_DATE', {
        type: 'state',
        common: {
            name: 'VACATION END DATE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('VACATION.END_TIME', {
        type: 'state',
        common: {
            name: 'VACATION END TIME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM', {
        type: 'object',
        common: {
            name: 'PROGRAM',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0', {
        type: 'object',
        common: {
            name: 'PROGRAM 0',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.1', {
        type: 'object',
        common: {
            name: 'PROGRAM 0 shift 1',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.1.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 0 1 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.1.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 0 1 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.2', {
        type: 'object',
        common: {
            name: 'PROGRAM 0 shift 2',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.2.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 0 2 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.2.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 0 2 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.3', {
        type: 'object',
        common: {
            name: 'PROGRAM 0 shift 3',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.3.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 0 3 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.3.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 0 3 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.4', {
        type: 'object',
        common: {
            name: 'PROGRAM 0 shift 4',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });    
    adapter.setObject('PROGRAM.0.4.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 0 4 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.0.4.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 0 4 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1', {
        type: 'object',
        common: {
            name: 'PROGRAM 1',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });	
	adapter.setObject('PROGRAM.1.1', {
        type: 'object',
        common: {
            name: 'PROGRAM 1 shift 1',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.1.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 1 1 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.1.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 1 2 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.2', {
        type: 'object',
        common: {
            name: 'PROGRAM 1 shift 2',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.2.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 1 2 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.2.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 1 2 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.3', {
        type: 'object',
        common: {
            name: 'PROGRAM 1 shift 3',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.3.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 1 3 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.3.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 1 3 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.4', {
        type: 'object',
        common: {
            name: 'PROGRAM 1 shift 4',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });    
    adapter.setObject('PROGRAM.1.4.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 1 4 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.1.4.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 1 4 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('PROGRAM.2', {
        type: 'object',
        common: {
            name: 'PROGRAM 2',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });	
	adapter.setObject('PROGRAM.2.1', {
        type: 'object',
        common: {
            name: 'PROGRAM 2 shift 1',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.1.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 2 1 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.1.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 2 2 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.2', {
        type: 'object',
        common: {
            name: 'PROGRAM 2 shift 2',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.2.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 2 2 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.2.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 2 2 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.3', {
        type: 'object',
        common: {
            name: 'PROGRAM 2 shift 3',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.3.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 2 3 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.3.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 2 3 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.4', {
        type: 'object',
        common: {
            name: 'PROGRAM 2 shift 4',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });    
    adapter.setObject('PROGRAM.2.4.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 2 4 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.2.4.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 2 4 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('PROGRAM.3', {
        type: 'object',
        common: {
            name: 'PROGRAM 3',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });	
	adapter.setObject('PROGRAM.3.1', {
        type: 'object',
        common: {
            name: 'PROGRAM 3 shift 1',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.1.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 3 1 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.1.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 3 2 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.2', {
        type: 'object',
        common: {
            name: 'PROGRAM 3 shift 2',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.2.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 3 2 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.2.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 3 2 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.3', {
        type: 'object',
        common: {
            name: 'PROGRAM 3 shift 3',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.3.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 3 3 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.3.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 3 3 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.4', {
        type: 'object',
        common: {
            name: 'PROGRAM 3 shift 4',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });    
    adapter.setObject('PROGRAM.3.4.START', {
        type: 'state',
        common: {
            name: 'PROGRAM 3 4 START',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
    adapter.setObject('PROGRAM.3.4.END', {
        type: 'state',
        common: {
            name: 'PROGRAM 3 4 END',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA', {
        type: 'object',
        common: {
            name: 'HEATAREA',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.0', {
        type: 'object',
        common: {
            name: 'HEATAREA 0',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.0.HEATAREA_NAME', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 HEATAREA_NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.0.HEATAREA_MODE', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 HEATAREA_MODE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.0.T_ACTUAL', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 T_ACTUAL',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.0.T_TARGET', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 T_TARGET',
            type: 'number',
            unit: '°C',
            read: true,
            write: true,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.0.PROGRAM_WEEK', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 PROGRAMM_WEEK',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.0.PROGRAM_WEEKEND', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 PROGRAMM_WEEKEND',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.0.T_HEAT_DAY', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 T_HEAT_DAY',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.0.T_HEAT_NIGHT', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 T_HEAT_NIGHT',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.1', {
        type: 'object',
        common: {
            name: 'HEATAREA 1',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.1.HEATAREA_NAME', {
        type: 'state',
        common: {
            name: 'HEATAREA 1 HEATAREA_NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.1.HEATAREA_MODE', {
        type: 'state',
        common: {
            name: 'HEATAREA 1 HEATAREA_MODE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.1.T_ACTUAL', {
        type: 'state',
        common: {
            name: 'HEATAREA 1 T_ACTUAL',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.1.T_TARGET', {
        type: 'state',
        common: {
            name: 'HEATAREA 1 T_TARGET',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.1.PROGRAM_WEEK', {
        type: 'state',
        common: {
            name: 'HEATAREA 1 PROGRAMM_WEEK',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.1.PROGRAM_WEEKEND', {
        type: 'state',
        common: {
            name: 'HEATAREA 1 PROGRAMM_WEEKEND',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.1.T_HEAT_DAY', {
        type: 'state',
        common: {
            name: 'HEATAREA 1 T_HEAT_DAY',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.1.T_HEAT_NIGHT', {
        type: 'state',
        common: {
            name: 'HEATAREA 1 T_HEAT_NIGHT',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.2', {
        type: 'object',
        common: {
            name: 'HEATAREA 2',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.2.HEATAREA_NAME', {
        type: 'state',
        common: {
            name: 'HEATAREA 2 HEATAREA_NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.2.HEATAREA_MODE', {
        type: 'state',
        common: {
            name: 'HEATAREA 2 HEATAREA_MODE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.2.T_ACTUAL', {
        type: 'state',
        common: {
            name: 'HEATAREA 2 T_ACTUAL',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.2.T_TARGET', {
        type: 'state',
        common: {
            name: 'HEATAREA 2 T_TARGET',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.2.PROGRAM_WEEK', {
        type: 'state',
        common: {
            name: 'HEATAREA 2 PROGRAMM_WEEK',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.2.PROGRAM_WEEKEND', {
        type: 'state',
        common: {
            name: 'HEATAREA 2 PROGRAMM_WEEKEND',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.2.T_HEAT_DAY', {
        type: 'state',
        common: {
            name: 'HEATAREA 2 T_HEAT_DAY',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.2.T_HEAT_NIGHT', {
        type: 'state',
        common: {
            name: 'HEATAREA 2 T_HEAT_NIGHT',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.3', {
        type: 'object',
        common: {
            name: 'HEATAREA 3',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.3.HEATAREA_NAME', {
        type: 'state',
        common: {
            name: 'HEATAREA 3 HEATAREA_NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.3.HEATAREA_MODE', {
        type: 'state',
        common: {
            name: 'HEATAREA 3 HEATAREA_MODE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.3.T_ACTUAL', {
        type: 'state',
        common: {
            name: 'HEATAREA 3 T_ACTUAL',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.3.T_TARGET', {
        type: 'state',
        common: {
            name: 'HEATAREA 3 T_TARGET',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.3.PROGRAM_WEEK', {
        type: 'state',
        common: {
            name: 'HEATAREA 3 PROGRAMM_WEEK',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.3.PROGRAM_WEEKEND', {
        type: 'state',
        common: {
            name: 'HEATAREA 3 PROGRAMM_WEEKEND',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.3.T_HEAT_DAY', {
        type: 'state',
        common: {
            name: 'HEATAREA 3 T_HEAT_DAY',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.3.T_HEAT_NIGHT', {
        type: 'state',
        common: {
            name: 'HEATAREA 3 T_HEAT_NIGHT',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.4', {
        type: 'object',
        common: {
            name: 'HEATAREA 4',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.4.HEATAREA_NAME', {
        type: 'state',
        common: {
            name: 'HEATAREA 4 HEATAREA_NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.4.HEATAREA_MODE', {
        type: 'state',
        common: {
            name: 'HEATAREA 4 HEATAREA_MODE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.4.T_ACTUAL', {
        type: 'state',
        common: {
            name: 'HEATAREA 4 T_ACTUAL',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.4.T_TARGET', {
        type: 'state',
        common: {
            name: 'HEATAREA 4 T_TARGET',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.4.PROGRAM_WEEK', {
        type: 'state',
        common: {
            name: 'HEATAREA 4 PROGRAMM_WEEK',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.4.PROGRAM_WEEKEND', {
        type: 'state',
        common: {
            name: 'HEATAREA 4 PROGRAMM_WEEKEND',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.4.T_HEAT_DAY', {
        type: 'state',
        common: {
            name: 'HEATAREA 4 T_HEAT_DAY',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.4.T_HEAT_NIGHT', {
        type: 'state',
        common: {
            name: 'HEATAREA 0 T_HEAT_NIGHT',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.5', {
        type: 'object',
        common: {
            name: 'HEATAREA 5',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.5.HEATAREA_NAME', {
        type: 'state',
        common: {
            name: 'HEATAREA 5 HEATAREA_NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.5.HEATAREA_MODE', {
        type: 'state',
        common: {
            name: 'HEATAREA 5 HEATAREA_MODE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.5.T_ACTUAL', {
        type: 'state',
        common: {
            name: 'HEATAREA 5 T_ACTUAL',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.5.T_TARGET', {
        type: 'state',
        common: {
            name: 'HEATAREA 5 T_TARGET',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.5.PROGRAM_WEEK', {
        type: 'state',
        common: {
            name: 'HEATAREA 5 PROGRAMM_WEEK',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.5.PROGRAM_WEEKEND', {
        type: 'state',
        common: {
            name: 'HEATAREA 5 PROGRAMM_WEEKEND',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.5.T_HEAT_DAY', {
        type: 'state',
        common: {
            name: 'HEATAREA 5 T_HEAT_DAY',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.5.T_HEAT_NIGHT', {
        type: 'state',
        common: {
            name: 'HEATAREA 5 T_HEAT_NIGHT',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.6', {
        type: 'object',
        common: {
            name: 'HEATAREA 6',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.6.HEATAREA_NAME', {
        type: 'state',
        common: {
            name: 'HEATAREA 6 HEATAREA_NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.6.HEATAREA_MODE', {
        type: 'state',
        common: {
            name: 'HEATAREA 6 HEATAREA_MODE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.6.T_ACTUAL', {
        type: 'state',
        common: {
            name: 'HEATAREA 6 T_ACTUAL',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.6.T_TARGET', {
        type: 'state',
        common: {
            name: 'HEATAREA 6 T_TARGET',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.6.PROGRAM_WEEK', {
        type: 'state',
        common: {
            name: 'HEATAREA 6 PROGRAMM_WEEK',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.6.PROGRAM_WEEKEND', {
        type: 'state',
        common: {
            name: 'HEATAREA 6 PROGRAMM_WEEKEND',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.6.T_HEAT_DAY', {
        type: 'state',
        common: {
            name: 'HEATAREA 6 T_HEAT_DAY',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.6.T_HEAT_NIGHT', {
        type: 'state',
        common: {
            name: 'HEATAREA 6 T_HEAT_NIGHT',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.7', {
        type: 'object',
        common: {
            name: 'HEATAREA 7',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.7.HEATAREA_NAME', {
        type: 'state',
        common: {
            name: 'HEATAREA 7 HEATAREA_NAME',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.7.HEATAREA_MODE', {
        type: 'state',
        common: {
            name: 'HEATAREA 7 HEATAREA_MODE',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
	adapter.setObject('HEATAREA.7.T_ACTUAL', {
        type: 'state',
        common: {
            name: 'HEATAREA 7 T_ACTUAL',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.7.T_TARGET', {
        type: 'state',
        common: {
            name: 'HEATAREA 7 T_TARGET',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.7.PROGRAM_WEEK', {
        type: 'state',
        common: {
            name: 'HEATAREA 7 PROGRAMM_WEEK',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.7.PROGRAM_WEEKEND', {
        type: 'state',
        common: {
            name: 'HEATAREA 7 PROGRAMM_WEEKEND',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATAREA.7.T_HEAT_DAY', {
        type: 'state',
        common: {
            name: 'HEATAREA 7 T_HEAT_DAY',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATAREA.7.T_HEAT_NIGHT', {
        type: 'state',
        common: {
            name: 'HEATAREA 7 T_HEAT_NIGHT',
            type: 'number',
            unit: '°C',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
			adapter.setObject('HEATCTRL', {
        type: 'object',
        common: {
            name: 'HEATCONTROL',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.0', {
        type: 'object',
        common: {
            name: 'HEATCONTROL 0',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.0.INUSE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL INUSE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.0.HEATAREA_NR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.0.ACTOR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.0.HEATCTRL_STATE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.1', {
        type: 'object',
        common: {
            name: 'HEATCONTROL 1',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.1.INUSE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL INUSE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.1.HEATAREA_NR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.1.ACTOR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.1.HEATCTRL_STATE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.2', {
        type: 'object',
        common: {
            name: 'HEATCONTROL 2',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.2.INUSE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL INUSE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.2.HEATAREA_NR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.2.ACTOR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.2.HEATCTRL_STATE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.3', {
        type: 'object',
        common: {
            name: 'HEATCONTROL 3',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.3.INUSE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL INUSE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.3.HEATAREA_NR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.3.ACTOR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.3.HEATCTRL_STATE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.4', {
        type: 'object',
        common: {
            name: 'HEATCONTROL 4',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.4.INUSE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL INUSE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.4.HEATAREA_NR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.4.ACTOR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.4.HEATCTRL_STATE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.5', {
        type: 'object',
        common: {
            name: 'HEATCONTROL 5',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.5.INUSE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL INUSE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.5.HEATAREA_NR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.5.ACTOR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.5.HEATCTRL_STATE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.6', {
        type: 'object',
        common: {
            name: 'HEATCONTROL 6',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.6.INUSE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL INUSE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.6.HEATAREA_NR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.6.ACTOR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.6.HEATCTRL_STATE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.7', {
        type: 'object',
        common: {
            name: 'HEATCONTROL 7',
            type: 'object',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.7.INUSE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL INUSE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.7.HEATAREA_NR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'string',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.7.ACTOR', {
        type: 'state',
        common: {
            name: 'HEATCONTROL HEATAREA',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });
		adapter.setObject('HEATCTRL.7.HEATCTRL_STATE', {
        type: 'state',
        common: {
            name: 'HEATCONTROL STATE',
            type: 'boolean',
            unit: '',
            read: true,
            write: false,
			role: 'EZR'
        },   
        native: {}
    });


    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    /**
     *   setState examples
     *
     *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
     *
     */

    // the variable testVariable is set to true as command (ack=false)
   // adapter.setState('testVariable', ack: true});

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
  //  adapter.setState('testVariable', {val: true, ack: true});

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
  //  adapter.setState('testVariable', {val: true, ack: true, expire: 30});



    // examples for the checkPassword/checkGroup functions
  //  adapter.checkPassword('admin', 'iobroker', function (res) {
  //      console.log('check user admin pw ioboker: ' + res);
  //  });

  //  adapter.checkGroup('admin', 'admin', function (res) {
  //      console.log('check group user admin group admin: ' + res);
  //  });



}
