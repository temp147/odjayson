/**
 * Created by openerp on 12/1/16.
 */

var Odoo = require('./odoo.js');

exports.initialize = function initializeDataSource(dataSource, cb) {
    var settings = dataSource.settings || {};

    dataSource.connector = new Odoo(settings);
    // odooConnector.connect(cb);

    if(cb){
        process.nextTick(cb);
    }

};

//todo:add error handle for the wrong connection string
//todo:build the where build
//todo:add the unit test