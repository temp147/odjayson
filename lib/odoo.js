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

        Connector.call(this,'odoo',opts);

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

        if (typeof cb !== 'function') {
            throw new Error(g.f('{{cb}} should be a function'));
        }

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
     *
     *   "and":[
     *       {"id":"1"},
     *       {"last_name":{"neq" :"test3"}},
     *       {"or":[{"first_name":"last"},{"title":"IT1"}]}
     *   ]
     * @return{Object} query  The odoo where query
     *
     *    [['id','=','1'],
     *    ['last_name','!=','test3'],
     *    '|',['model.first_name','=','last'],
     *    ['model.title','=','IT1']]
     *
     */
    Odoo.prototype._buildWhere = function (model, where) {
        var self = this;
        var query = [];
        if (where === null || (typeof where !== 'object')){
            return query;
        }
        Object.keys(where).forEach(function (k) {
            var cond = where[k];
            //to replay the 'and' 'or' operation and self call if the key is array.
            if(k === 'and' || k === 'or' || k === 'nor'){
                if(Array.isArray(cond)){
                    cond = cond.map(function (c) {
                        query.push(self._buildWhere(model, c));
                        return;
                    })
                }
                if(k === 'or'){
                    var condition=k.replace(/and/,'&').replace(/or/,'|').replace(/nor/,'');//todo: what is nor?
                    query.unshift(condition);
                }
                // query['$' + k] = cond;
                return;
            }

            var propName = k;

            var prop = self.getPropertyDefinition(model,propName);
            // console.dir(prop);
            var spec = false;
            var options = null;

            //get {"neq" :"test2"} from {"last_name":{"neq" :"test2"}}
            // spec = 'neq'     cond = test2
            if(cond && cond.constructor.name === 'Object'){

                spec = Object.keys(cond)[0];
                cond = cond[spec];
            }
            if(spec){
                if(spec === 'between'){
                    //todo impl between
                }else if(spec === 'inq'){
                    //todo impl inq
                }else if(spec === 'nin'){
                    //todo impl nin
                }else if(spec === 'like'){
                    //todo impl like
                }else if(spec === 'nlike'){
                    //todo impl nlike
                }else if(spec === 'neq'){
                    query = [k,'!=',cond];
                }else if(spec === 'regexp'){
                    //todo impl regexp
                }
            } else {//k the is the id or value
                query = [k,'=',cond];
            }
        });
        return query
    };
    // Odoo.prototype._buildWhere = function (model, where) {
    //     //todo :implement _buildWhere
    //     var self = this;
    //     var query = {};
    //     if (where === null || (typeof where !== 'object')) {
    //         return query;
    //     }
    //     var idName = self.idName(model);
    //     Object.keys(where).forEach(function(k) {
    //         var cond = where[k];
    //         if (k === 'and' || k === 'or' || k === 'nor') {
    //             if (Array.isArray(cond)) {
    //                 cond = cond.map(function(c) {
    //                     return self._buildWhere(model, c);
    //                 });
    //             }
    //             // k=k.replace(/and/g,'&').replace(/or/g,'|');
    //             query['$' + k] = cond;
    //             // query[k] = cond;
    //             delete query[k];
    //             return;
    //         }
    //         if (k === idName) {
    //             k = '_id';
    //         }
    //         var propName = k;
    //         if (k === '_id') {
    //             propName = idName;
    //         }
    //
    //         var prop = self.getPropertyDefinition(model, propName);
    //
    //         var spec = false;
    //         var options = null;
    //         if (cond && cond.constructor.name === 'Object') {
    //             options = cond.options;
    //             spec = Object.keys(cond)[0];
    //             cond = cond[spec];
    //         }
    //         if (spec) {
    //             if (spec === 'between') {
    //                 query[k] = { $gte: cond[0], $lte: cond[1] };
    //             } else if (spec === 'inq') {
    //                 cond = [].concat(cond || []);
    //                 query[k] = {
    //                     $in: cond.map(function(x) {
    //                         if (self.isObjectIDProperty(model, prop, x)) return ObjectID(x);
    //                         return x;
    //                     }),
    //                 };
    //             } else if (spec === 'nin') {
    //                 cond = [].concat(cond || []);
    //                 query[k] = {
    //                     $nin: cond.map(function(x) {
    //                         if (self.isObjectIDProperty(model, prop, x)) return ObjectID(x);
    //                         return x;
    //                     }),
    //                 };
    //             } else if (spec === 'like') {
    //                 query[k] = { $regex: new RegExp(cond, options) };
    //             } else if (spec === 'nlike') {
    //                 query[k] = { $not: new RegExp(cond, options) };
    //             } else if (spec === 'neq') {
    //                 query[k] = { $ne: cond };
    //             } else if (spec === 'regexp') {
    //                 if (cond.global)
    //                     g.warn('{{MongoDB}} regex syntax does not respect the {{`g`}} flag');
    //
    //                 query[k] = { $regex: cond };
    //             } else {
    //                 query[k] = {};
    //                 query[k]['$' + spec] = cond;
    //             }
    //         } else {
    //             if (cond === null) {
    //                 // http://docs.mongodb.org/manual/reference/operator/query/type/
    //                 // Null: 10
    //                 query[k] = { $type: 10 };
    //             } else {
    //                     // if (self.isObjectIDProperty(model, prop, cond)) {
    //                     //     cond = ObjectID(cond);
    //                     // }
    //                 query[k] = cond;
    //             }
    //         }
    //     });
    //     return query;
    // };

    Odoo.prototype.create = function (model, id, option, cb) {
        console.log('create');
        cb(null,'success')
    };

    Odoo.prototype.buildNearFilter = function (model, id, option, cb) {
        console.log('buildNearFilter');
        cb(null,'success')
    };

    Odoo.prototype.destroyAll = function (model, id, option, cb) {
        console.log('destroyAll');
        cb(null,'success')
    };

    Odoo.prototype.all = function (model, filter, option, cb) {
        console.log('all');
        // console.log(filter);

        var self = this;

        this.connect(function (err, response, sid) {
            if(err) throw err;

            if(response.result.uid){
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }

            filter = filter || {};

            var query = [];

            if(filter.where){
                query = self._buildWhere(model,filter.where);
                console.dir(query);
                // query = ['&',['last_name','=' ,'test2'],['id', '=','1']];
                // query = [['id', '=','1']];
                // query = ['&',['last_name','=' ,'test2'],[]];


            }

            var fields = filter.fields;

            var offset = filter.offset;

            var limit = filter.limit;

            var sort = filter.order;

            self._search(model,responseHandle,query,fields,offset,limit,sort);

            function responseHandle(err,res) {
                if(err) throw err;
                 // console.log(res.result.name);
                cb(null,res.result);
            }
        });

    };

    Odoo.prototype.destroyAll = function (model, id, option, cb) {
        console.log('destroyAll');
        cb(null,'success')
    };


    Odoo.prototype.save = function (model, id, option, cb) {
        console.log('save');
        cb(null,'success')
    };


    Odoo.prototype.update = function (model, id, option, cb) {
        console.log('update');
        cb(null,'success')
    };


    Odoo.prototype.destroy = function (model, id, option, cb) {
        console.log('destroy');
        cb(null,'success')
    };


    Odoo.prototype.replaceById = function (model, id, option, cb) {
        console.log('replaceById');
        cb(null,'success')
    };


    Odoo.prototype.updateAttributes = function (model, id, option, cb) {
        console.log('updateAttributes');
        cb(null,'success')
    };


    return Odoo;
})();
