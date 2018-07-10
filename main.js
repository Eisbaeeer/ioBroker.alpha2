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
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
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

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('config test1: '    + adapter.config.test1);
    adapter.log.info('config test1: '    + adapter.config.test2);
    adapter.log.info('config mySelect: ' + adapter.config.mySelect);


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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
        },   
        native: {}
    });
    adapter.setObject('DEVICE.T_HEAT_VACATION', {
        type: 'state',
        common: {
            name: 'VACATION_TEMP',
            type: 'number',
            unit: '°C',
            read: true,
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
            write: false
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
   // adapter.setState('testVariable', true);

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
