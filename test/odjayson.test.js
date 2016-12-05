/**
 * Created by openerp on 12/5/16.
 */

var loopback = require("loopback");

describe('odoo json connect',function () {

    it('build connect',function (done) {
        var ds = loopback.createDataSource({
            connector: require("../index"),
            login : 'system',
            password : 'admin',
            db : 'openerp',
            host : 'localhost',
            port: '8069'
        });

        done();
    })

});