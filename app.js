/**
 * Created by openerp on 12/5/16.
 */



var loopback = require('loopback');

var ds = loopback.createDataSource({
    connector: require("./index"),
    login : 'system',
    password : 'admin',
    db : 'openerp',
    host : 'localhost',
    port: '8069'
});
