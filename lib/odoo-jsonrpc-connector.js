/**
 * Created by openerp on 12/1/16.
 */

var Odoo = require('./odoo.js');

exports.initialize = function initializeDataSource(dataSource, cb) {
    var settings = dataSource.settings || {};

    var odooConnector = new Odoo(settings);

    dataSource.connector = odooConnector;
    // odooConnector.connect(cb);

    if(cb){
        process.nextTick(cb);
    }


    // function on_auth(err,responese,sid) {
    //     if(err) throw err;
    //     // console.log(err);
    //     if(responese.result.uid){
    //         connector.session_id = responese.result.session_id;
    //         // console.log(connector);
    //         // callback;
    //         return
    //     }
    // }

};

//todo:add error handle for the wrong connection string
//todo:build the where build
//todo:add the unit test