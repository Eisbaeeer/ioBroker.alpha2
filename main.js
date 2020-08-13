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
const utils = require('@iobroker/adapter-core'); // Get common adapter utils

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
    adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    //adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.debug('ack is not set!');
		adapter.log.debug('Value: ' + state.val);
		adapter.log.debug('id: ' + id);
		
		// save value in var
		var new_val = state.val;
		
		// Set HEATAREA values
        for (var i = 1; i < 13; i++) //Alle möglichen HEATAREA's abprüfen..
        {
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.T_TARGET') {var heatarea = i; var new_target = 'T_TARGET'; var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.T_HEAT_DAY') {var heatarea = i; var new_target = 'T_HEAT_DAY'; var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.T_HEAT_NIGHT') {var heatarea = i; var new_target = 'T_HEAT_NIGHT'; var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.T_COOL_DAY') {var heatarea = i; var new_target = 'T_COOL_DAY'; var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.T_COOL_NIGHT') {var heatarea = i; var new_target = 'T_COOL_NIGHT'; var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.HEATAREA_MODE') {var heatarea = i; var new_target = 'HEATAREA_MODE'; var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}		
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.PROGRAM_WEEK') {var heatarea = i;	var new_target = 'PROGRAM_WEEK'; var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.PROGRAM_WEEKEND') {var heatarea = i;var new_target = 'PROGRAM_WEEKEND';var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}
            if (id == adapter.namespace + '.' + 'HEATAREA.' + i + '.ISLOCKED') {var heatarea = i;var new_target = 'ISLOCKED';var xml_construct = '<HEATAREA nr="'+ heatarea +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></HEATAREA>';}            
        }
		if (id == adapter.namespace + '.' + 'DEVICE.T_HEAT_VACATION') {var new_target = 'T_HEAT_VACATION';var xml_construct = '<'+ new_target +'>'+ new_val +'</'+ new_target +'>';}
		
		if (id == adapter.namespace + '.' + 'PROGRAM.1.1.END') {var nr = '1'; var shift = '1';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.1.1.START') {var nr = '1'; var shift = '1';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.1.2.END') {var nr = '1'; var shift = '2';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.1.2.START') {var nr = '1'; var shift = '2';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.1.3.END') {var nr = '1'; var shift = '3';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.1.3.START') {var nr = '1'; var shift = '3';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.1.4.END') {var nr = '1'; var shift = '4';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.1.4.START') {var nr = '1'; var shift = '4';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.2.1.END') {var nr = '2'; var shift = '1';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.2.1.START') {var nr = '2'; var shift = '1';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.2.2.END') {var nr = '2'; var shift = '2';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.2.2.START') {var nr = '2'; var shift = '2';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.2.3.END') {var nr = '2'; var shift = '3';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.2.3.START') {var nr = '2'; var shift = '3';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.2.4.END') {var nr = '2'; var shift = '4';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.2.4.START') {var nr = '2'; var shift = '4';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.3.1.END') {var nr = '3'; var shift = '1';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.3.1.START') {var nr = '3'; var shift = '1';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.3.2.END') {var nr = '3'; var shift = '2';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.3.2.START') {var nr = '3'; var shift = '2';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.3.3.END') {var nr = '3'; var shift = '3';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.3.3.START') {var nr = '3'; var shift = '3';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.3.4.END') {var nr = '3'; var shift = '4';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.3.4.START') {var nr = '3'; var shift = '4';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.4.1.END') {var nr = '4'; var shift = '1';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.4.1.START') {var nr = '4'; var shift = '1';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.4.2.END') {var nr = '4'; var shift = '2';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.4.2.START') {var nr = '4'; var shift = '2';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.4.3.END') {var nr = '41'; var shift = '3';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.4.3.START') {var nr = '4'; var shift = '3';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.4.4.END') {var nr = '4'; var shift = '4';var new_target = 'END';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		if (id == adapter.namespace + '.' + 'PROGRAM.4.4.START') {var nr = '4'; var shift = '4';var new_target = 'START';var xml_construct = '<PROGRAM><SHIFT_PROGRAM nr="'+ nr +'" shiftingtime="'+ shift +'"><'+ new_target +'>'+ new_val +'</'+ new_target +'></SHIFT_PROGRAM></PROGRAM>';}
		
		
		if (id == adapter.namespace + '.' + 'VACATION.START_DATE') {var new_target = 'START_DATE';var xml_construct = '<VACATION><'+ new_target +'>'+ new_val +'</'+ new_target +'></VACATION>';}
		if (id == adapter.namespace + '.' + 'VACATION.END_DATE') {var new_target = 'END_DATE';var xml_construct = '<VACATION><'+ new_target +'>'+ new_val +'</'+ new_target +'></VACATION>';}
		if (id == adapter.namespace + '.' + 'T_HEAT_VACATION') {var xml_construct = '<T_HEAT_VACATION>'+ new_val +'</T_HEAT_VACATION>';}
		
		
			// Post DATA to DEVICE
			var data = '<?xml version="1.0" encoding="UTF-8"?><Devices><Device><ID>'+ device_id +'</ID>'+ xml_construct +'</Device></Devices>';
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
			host: adapter.config.host,
			path: '/data/changes.xml',
			method: 'POST'                // in der Regel: "GET"
			};
	
    var req = http.request(options, function(res) {
    adapter.log.debug("http Status: " + res.statusCode);
    adapter.log.debug('HEADERS: ' + JSON.stringify(res.headers), (res.statusCode != 200 ? "warn" : "info")); // Header (R�ckmeldung vom Webserver)
	 if (res.statusCode == 200) {
		setTimeout(getXMLcyclic,5000);
	}
	});
    
    req.on('error', function(e) { // Fehler abfangen
        adapter.log.info('ERROR: ' + e.message,"warn");
    });

    adapter.log.debug("Data to request body: " + data);
    // write data to request body
    (data ? req.write(data) : adapter.log.info("Daten: keine Daten angegeben"));
    req.end();
}

// Get XML Data from API
function getXMLcyclic() {
		request('http://'+adapter.config.host+'/data/static.xml', function (error, response, body) {
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
				adapter.log.debug("XMLcyclic: " + JSON.stringify(obj));
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
                
                adapter.log.debug("Program lenght 0: " + obj.Device.PROGRAM.SHIFT_PROGRAM.length);
				
				// Fill PROGRAM objects with variable XML array lenght
				if (obj.Device.PROGRAM.SHIFT_PROGRAM.length < 16) {
					for (var i = 1; i < 17; i++) {
						adapter.setState(adapter.namespace + '.' + 'PROGRAM.'+ [i] +'.'+ [i] +'.START', {val: null, ack: true});
						adapter.setState(adapter.namespace + '.' + 'PROGRAM.'+ [i] +'.'+ [i] +'.END', {val: null, ack: true});
					}
				}
					
				for (var i = 0; i < obj.Device.PROGRAM.SHIFT_PROGRAM.length; i++) {
					adapter.log.debug("--- for loop position: " + i);
					adapter.log.debug("Program NR: " + obj.Device.PROGRAM.SHIFT_PROGRAM[i].nr);				
					adapter.log.debug("Shiftingtime: " + obj.Device.PROGRAM.SHIFT_PROGRAM[i].shiftingtime);
					adapter.log.debug("Start: " + obj.Device.PROGRAM.SHIFT_PROGRAM[i].START);
					adapter.log.debug("End: " + obj.Device.PROGRAM.SHIFT_PROGRAM[i].END);
					adapter.log.debug("PROGRAM: " + obj.Device.PROGRAM.SHIFT_PROGRAM[i].nr +'.'+ obj.Device.PROGRAM.SHIFT_PROGRAM[i].shiftingtime +'.'+ obj.Device.PROGRAM.SHIFT_PROGRAM[i].START);
					adapter.log.debug("PROGRAM: " + obj.Device.PROGRAM.SHIFT_PROGRAM[i].nr +'.'+ obj.Device.PROGRAM.SHIFT_PROGRAM[i].shiftingtime +'.'+ obj.Device.PROGRAM.SHIFT_PROGRAM[i].END);
				
					adapter.setState(adapter.namespace + '.' + 'PROGRAM.'+ obj.Device.PROGRAM.SHIFT_PROGRAM[i].nr +'.'+ obj.Device.PROGRAM.SHIFT_PROGRAM[i].shiftingtime +'.START', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[i].START , ack: true});
					adapter.setState(adapter.namespace + '.' + 'PROGRAM.'+ obj.Device.PROGRAM.SHIFT_PROGRAM[i].nr +'.'+ obj.Device.PROGRAM.SHIFT_PROGRAM[i].shiftingtime +'.END', {val: obj.Device.PROGRAM.SHIFT_PROGRAM[i].END , ack: true});
				}				
					
				for (var i = 0; i < obj.Device.HEATAREA.length; i++) {
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.'+ [i] +'.HEATAREA_NAME', {val: obj.Device.HEATAREA[i].HEATAREA_NAME, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.'+ [i] +'.HEATAREA_MODE', {val: obj.Device.HEATAREA[i].HEATAREA_MODE, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.'+ [i] +'.T_ACTUAL', {val: parseFloat(obj.Device.HEATAREA[i].T_ACTUAL), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.'+ [i] +'.T_TARGET', {val: parseFloat(obj.Device.HEATAREA[i].T_TARGET), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.'+ [i] +'.PROGRAM_WEEK', {val: obj.Device.HEATAREA[i].PROGRAM_WEEK, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.'+ [i] +'.PROGRAM_WEEKEND', {val: obj.Device.HEATAREA[i].PROGRAM_WEEKEND, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.'+ [i] +'.T_HEAT_DAY', {val: parseFloat(obj.Device.HEATAREA[i].T_HEAT_DAY), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATAREA.'+ [i] +'.T_HEAT_NIGHT', {val: parseFloat(obj.Device.HEATAREA[i].T_HEAT_NIGHT), ack: true});
                }
								
				for (var i = 0; i < obj.Device.HEATCTRL.length; i++) {
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.'+ [i] +'.INUSE', {val: Boolean(Number(obj.Device.HEATCTRL[i].INUSE)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.'+ [i] +'.HEATAREA_NR', {val: obj.Device.HEATCTRL[i].HEATAREA_NR, ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.'+ [i] +'.ACTOR', {val: Boolean(Number(obj.Device.HEATCTRL[i].ACTOR)), ack: true});
                adapter.setState(adapter.namespace + '.' + 'HEATCTRL.'+ [i] +'.HEATCTRL_STATE', {val: Boolean(Number(obj.Device.HEATCTRL[i].HEATCTRL_STATE)), ack: true});
				}
						   
			    // fill global vals
				device_id = obj.Device.ID;
			   
        }
    });
	
}
		
function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    	
	/*
	* Interval
	* example 
	* setInterval(pifaceread, adapter.config.piinterval);
	*/
	setInterval(getXMLcyclic, adapter.config.polltime);
	adapter.log.info('config host: ' + adapter.config.host);
	adapter.log.info('config polltime: ' + adapter.config.polltime);


    /**
     *
     *      For every state in the system there has to be also an object of type state
     *
     *      Here a simple template for a boolean variable named "testVariable"
     *
     *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
     *
     */

   
    // in this template all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');
	getXMLcyclic();


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
