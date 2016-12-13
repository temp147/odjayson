/**
 * Created by openerp on 12/5/16.
 */
var jayson = require('jayson');
var http = require('http');
var _ = require('underscore');
var util = require('util');
// var debug = require('debug')('loopback:connector:odoo');

var Connector = require('loopback-connector').Connector;

module.exports =  (function (){

    function Odoo(opts){
        this.opts = opts;
        this.session_id = '';
        this.context = '';
        this.sid = '';

        Connector.call(this,'odoo',opts);

        if (opts && opts.port){
            this.port = opts.port;
        } else {
            this.port = '8069';
        }

        if (opts && opts.host){
            this.host = opts.host;
        } else {
            this.host = 'localhost';
        }

        this.protocol = 'http';
        this.base_location = this.protocol + '://' + this.host + ':' + this.port;

        this.paths = {
            'auth': this.base_location + '/web/session/authenticate',
            'databases': this.base_location + '/web/database/get_list',
            'dataset_call_kw': this.base_location + '/web/dataset/call_kw',
        };
    }
    util.inherits(Odoo,Connector);

    Odoo.prototype.database_getlist = function (cb) {
        var client = jayson.client.http(this.paths.databases);

        client.request('call',{'session_id': '', 'context':{}}, 'r8', cb);

    };

    Odoo.prototype.connect = function (cb){

        var params = {
            'db': this.opts.db,
            'login': this.opts.login,
            'password': this.opts.password,
            'base_location': this.base_location,
            //'session_id': "",
            'context': {}
        };

        var json = JSON.stringify({
            'jsonrpc': '2.0',
            'method': 'call',
            'params': params
        });

        var options = {
            'host': this.host,
            'port': this.port,
            'path': '/web/session/authenticate',
            'method': 'POST',
            'headers': {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Content-Length": json.length,
            }
        };


        var req = http.request(options, function(res){
            var response = '';

            res.setEncoding('utf8');

            var sid = res.headers['set-cookie'][0].split(';')[0];

            res.on('data', function (chunk){
                response += chunk;
            });

            res.on('end',function(){
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    var err = new Error(response);
                    err.code = res.statusCode;
                    return cb(err);
                } else {
                    return cb(null,JSON.parse(response),sid);
                }
            });
        });
        // console.log(json);
        req.write(json);
    };


    Odoo.prototype.rpc = function(path, cb, params, options) {

        params = params || {};

        options = options || {
                host: this.host,
                port: this.port,
                path: path || '/',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            };

        if (this.sid){
            var sid = this.sid + ';';
            options.headers.Cookie = this.sid + ';';
        }

        _.defaults(params,{
            context: this.context || {}
            // session_id: this.session_id || {},
        });

        var json_client = jayson.client.http(options);
        console.dir(params);
        // console.dir(_.uniqueId('r'));
        // console.dir(cb);
        return json_client.request('call', params, _.uniqueId('r'), cb);
    };


    Odoo.prototype._call = function (model, method, cb, args, kwargs){
        args = args || [
                false,
                "tree",
                {
                    "uid": this.context.uid,
                    "lang": this.context.lang,
                    "tz": this.context.tz,
                },
                true
            ];

        kwargs = kwargs || {};

        params =  {
            "kwargs": kwargs,
            "args": args,
            "model": model,
            "method": method,
        };

        this.rpc('/web/dataset/call_kw', cb, params);
    };

    Odoo.prototype._create = function (model, args, kwargs, cb) {
        this._call(model, "create", cb, args, kwargs);

    };


    Odoo.prototype.get_model = function (model,cb){
        this._call(model,"fields_view_get", cb);
    };


    /**
     * Basic Search
     *
     */
    Odoo.prototype._search = function (model,cb,filter,fields,offset,limit,sort){

        // example of filter = ["code", "=", "1.1.2"]

        fields = fields || [];

        var domain = [];

        if (filter){
            domain.push(filter);
        }

        var params = {
            "model": model,
            "domain": domain[0],
            "sort": sort,
            "fields": fields,
            "limit": limit || 80,
            "offset": offset || 0
        };

        this.rpc('/web/dataset/search_read', cb, params);

    };

    Odoo.prototype._read = function(model,cb,args,method){
        var params = {
            "model": model,
            "method" : method,
            "args": args
        };
        this.rpc('/web/dataset/call',cb,params);
    };

    Odoo.prototype._search_read = function(model,cb,args,method){
        var params = {
            "model": model,
            "method" : method,
            "args": args
        };
        this.rpc('/web/dataset/call',cb,params);
    };

    Odoo.prototype._delete = function(model,cb,method,args){

        var params = {
            "kwargs" : {},
            "model": model,
            "method" : method,
            "args": args
        };
        this.rpc('/web/dataset/call_kw',cb,params);
    };

    Odoo.prototype._write = function(model,cb,method,args){

        var params = {
            "kwargs" : {},
            "model": model,
            "method" : method,
            "args":args[0]
        };
        this.rpc('/web/dataset/call_kw',cb,params);
    };

    /**
     * Bulid the where query for odoo jsonRPC2.0
     *
     * @param {String} model  The model name
     * @param {Object} where  The loopback where query
     * @return{Object} query  The odoo where query
     */
    Odoo.prototype._buildWhere = function (model, where) {
        //todo :implement _buildWhere
        var query = {};
        return query;
    };

    Odoo.prototype.create = function (model, id, option, callback) {
        console.log('create');
        callback(null,'success')
    };

    Odoo.prototype.buildNearFilter = function (model, id, option, callback) {
        console.log('buildNearFilter');
        callback(null,'success')
    };

    Odoo.prototype.destroyAll = function (model, id, option, callback) {
        console.log('destroyAll');
        callback(null,'success')
    };

    Odoo.prototype.all = function (model, filter, option, callback) {
        console.log('all');
        console.log(filter);

        var self = this;

        this.connect(function (err, response, sid) {
            if(err) throw err;

            if(response.result.uid){
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }

            filter = filter || {};

            var query = {};

            if(filter.where){
                query = self._buildWhere(model,filter.where);
            }

            var fields = filter.fields;

            if(fields) {

            }else {

            }


            self._read('hr.employee',responseHandle,[1],'read');

            function responseHandle(err,response) {
                if(err) throw err;
                 console.log(response.result.name);
                callback(null,'123');

            }
        });

    };

    Odoo.prototype.destroyAll = function (model, id, option, callback) {
        console.log('destroyAll');
        callback(null,'success')
    };


    Odoo.prototype.save = function (model, id, option, callback) {
        console.log('save');
        callback(null,'success')
    };


    Odoo.prototype.update = function (model, id, option, callback) {
        console.log('update');
        callback(null,'success')
    };


    Odoo.prototype.destroy = function (model, id, option, callback) {
        console.log('destroy');
        callback(null,'success')
    };


    Odoo.prototype.replaceById = function (model, id, option, callback) {
        console.log('replaceById');
        callback(null,'success')
    };


    Odoo.prototype.updateAttributes = function (model, id, option, callback) {
        console.log('updateAttributes');
        callback(null,'success')
    };


    return Odoo;
})();
