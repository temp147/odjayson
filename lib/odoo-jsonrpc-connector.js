/**
 * Created by openerp on 12/1/16.
 */

var Odoo = require('./odoo.js');

exports.initialize = function initializeDataSource(dataSource, callback) {
    var settings = dataSource.settings || {};

    var connector = new Odoo(settings);

    dataSource.connector = connector;

    connector.connect(callback);

    function on_auth(err,responese,sid) {
        if(err) throw err;
        // console.log(err);
        if(responese.result.uid){
            connector.session_id = responese.result.session_id;
            // console.log(connector);
            // callback;
            return
        }
    }

};

