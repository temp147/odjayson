/**
 * Created by openerp on 12/5/16.
 */
var jayson = require('jayson');
var http = require('http');
var _ = require('underscore');
var util = require('util');

var Connector = require('loopback-connector').Connector;
var debug = require('debug')('loopback:connector:odoo');
debug.log = console.info.bind(console);

module.exports = (function () {

    function Odoo(opts) {
        this.opts = opts;
        this.session_id = '';
        this.context = '';
        this.sid = '';
        this.debug = opts.debug || false;

        if (opts && opts.port) {
            this.port = opts.port;
        } else {
            this.port = '8069';
        }

        if (opts && opts.host) {
            this.host = opts.host;
        } else {
            this.host = 'localhost';
        }

        Connector.call(this, 'odoo', opts);

        this.protocol = 'http';
        this.base_location = this.protocol + '://' + this.host + ':' + this.port;

        this.paths = {
            'auth': this.base_location + '/web/session/authenticate',
            'databases': this.base_location + '/web/database/get_list',
            'dataset_call_kw': this.base_location + '/web/dataset/call_kw',
        };
    }

    util.inherits(Odoo, Connector);

    Odoo.prototype.database_getlist = function (cb) {
        var client = jayson.client.http(this.paths.databases);

        client.request('call', {'session_id': '', 'context': {}}, 'r8', cb);

    };

    Odoo.prototype.connect = function (cb) {

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


        var req = http.request(options, function (res) {
            var response = '';

            res.setEncoding('utf8');

            var sid = res.headers['set-cookie'][0].split(';')[0];

            res.on('data', function (chunk) {
                response += chunk;
            });

            res.on('end', function () {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    var err = new Error(response);
                    err.code = res.statusCode;
                    return cb(err);
                } else {
                    return cb(null, JSON.parse(response), sid);
                }
            });
        });
        // console.log(json);
        req.write(json);
    };


    Odoo.prototype.rpc = function (path, cb, params, options) {

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

        if (this.sid) {
            var sid = this.sid + ';';
            options.headers.Cookie = this.sid + ';';
        }

        _.defaults(params, {
            context: this.context || {}
            // session_id: this.session_id || {},
        });

        var json_client = jayson.client.http(options);
        console.dir(params);
        // console.dir(_.uniqueId('r'));
        // console.dir(cb);

        return json_client.request('call', params, _.uniqueId('r'), cb);
    };


    Odoo.prototype._call = function (model, method, cb, args, kwargs) {
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

        params = {
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


    Odoo.prototype.get_model = function (model, cb) {
        this._call(model, "fields_view_get", cb);
    };


    /**
     * Basic Search
     *
     */
    Odoo.prototype._search = function (model, cb, filter, fields, offset, limit, sort) {

        // example of filter = ["code", "=", "1.1.2"]

        fields = fields || [];

        var domain = [];

        if (filter) {
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

    Odoo.prototype._read = function (model, cb, args, method) {
        var params = {
            "model": model,
            "method": method,
            "args": args
        };
        this.rpc('/web/dataset/call', cb, params);
    };

    Odoo.prototype._search_read = function (model, cb, args, method) {
        var params = {
            "model": model,
            "method": method,
            "args": args
        };
        this.rpc('/web/dataset/call', cb, params);
    };

    Odoo.prototype._delete = function (model, cb, method, args) {

        var params = {
            "kwargs": {},
            "model": model,
            "method": method,
            "args": args
        };
        this.rpc('/web/dataset/call_kw', cb, params);
    };

    Odoo.prototype._write = function (model, cb, method, args) {

        var params = {
            "kwargs": {},
            "model": model,
            "method": method,
            "args": args[0]
        };
        this.rpc('/web/dataset/call_kw', cb, params);
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
    //todo :add the unit test of the _buildWhere
    Odoo.prototype._buildWhere = function (model, where) {
        var self = this;
        var query = [];
        if (where === null || (typeof where !== 'object')) {
            return query;
        }
        Object.keys(where).forEach(function (k) {
            var cond = where[k];
            //to replay the 'and' 'or' operation and self call if the key is array.
            if (k === 'and' || k === 'or' || k === 'nor') {
                if (Array.isArray(cond)) {
                    console.log(cond.length);
                    cond = cond.map(function (c) {
                        //todo: how to handle the query if the params are only one  or more than two
                        // query.push(self._buildWhere(model, c));
                        query = query.concat(self._buildWhere(model, c));
                        return;
                    })
                }
                if (k === 'or') {
                    var condition = k.replace(/and/, '&').replace(/or/, '|').replace(/nor/, '');//todo: what is nor?
                    query.unshift(condition);
                }
                // query['$' + k] = cond;
                return;
            }

            var propName = k;

            var prop = self.getPropertyDefinition(model, propName);
            // console.dir(prop);
            var spec = false;
            var options = null;

            // get {"neq" :"test2"} from {"last_name":{"neq" :"test2"}}
            // spec = 'neq'     cond = test2
            if (cond && cond.constructor.name === 'Object') {
                options = cond.options;
                spec = Object.keys(cond)[0];
                cond = cond[spec];
            }
            //k the is the id or value, and cond is the condition;
            if (spec) {
                if (spec === 'between') {
                    query.push([k, '>=', cond[0]], [k, '<=', cond[1]]);
                } else if (spec === 'inq') {
                    cond = [].concat(cond || []);
                    query.push([k, 'in', cond]);
                } else if (spec === 'nin') {
                    cond = [].concat(cond || []);
                    query.push([k, 'not in', cond]);
                } else if (spec === 'like') {
                    query.push([k, '=like', new RegExp(cond, options)]);
                    //todo test like
                } else if (spec === 'nlike') {
                    query.push([k, 'not like', new RegExp(cond, options)]);
                    //todo test nlike
                } else if (spec === 'neq') {
                    query.push([k, '!=', cond]);
                } else if (spec === 'regexp') {
                    //todo impl regexp
                }
            } else {
                query.push([k, '=', cond]);
            }
        });
        return query
    };

    Odoo.prototype.create = function (model, data, options, cb) {
        //todo: add the unit test
        //todo: implement bulk insert
        console.log('create');

        model = model.replace('_','.');

        var self = this;

        this.connect(function (err, response, sid) {
            if (err) cb(err, null);
            // console.dir(response.result);

            if (response.result.uid) {
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }
            if (!Array.isArray(data)) {
                var tempdata = [];
                tempdata.push([data]);
                data = tempdata;
            }

            self._write(model, createResHandle, 'create', data);

            function createResHandle(err, res) {
                if (err) throw err;
                cb(null, res.result);
            }
        });

        // cb(null,'success')
    };

    Odoo.prototype.buildNearFilter = function (model, id, options, cb) {
        console.log('buildNearFilter');
        cb(null, 'success')
    };


    Odoo.prototype.all = function (model, filter, options, cb) {
        console.log('all');
        var self = this;

        model = model.replace('_','.');

        filter = filter || {};

        var query = [];

        if (filter.where) {
            // query should be like the following pattern
            // query = ['&',['last_name','=' ,'test2'],['id', '=','1']];
            // query = [['id', '=','1']];
            query = self._buildWhere(model, filter.where);
            // console.dir(query);
        }

        this.connect(function (err, response, sid) {
            if (err) throw err;

            if (response.result.uid) {
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }

            var fields = [];

            if(!filter.fields){
                var props = self._models[model].properties;
                for(var p in props){
                    fields.push(p)
                }
            }else {
                fields = filter.fields;
            }

            var offset = filter.offset;

            var limit = filter.limit;

            //support "sort":"title desc,id desc"
            if(Array.isArray(filter.order)){
                var sort = filter.order.toString();
            }else {
                var sort = filter.order;
            }

            self._search(model, allResHandle, query, fields, offset, limit, sort);

            function allResHandle(err, res) {
                if (err) throw err;
                // console.log(res.result.name);
                cb(null, res.result);
            }
        });
    };

    Odoo.prototype.destroyAll = function (model, where, options, cb) {
        console.log('destroyAll');
        var self = this;

        model = model.replace('_','.');

        if(self.debug){
            debug('destoryAll', model, where);
        }
        //todo: add error handle.
        if (!cb && 'function' === typeof where) {
            cb = where;
            where = undefined;
        }

        where = self._buildWhere(model,where);

        // console.log(where);

        this.connect(function (err, response, sid) {
            if (err) cb(err, null);
            // console.dir(response.result);

            if (response.result.uid) {
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }
            //get the id of where
            self._search(model, ResHandle, where, {id:true}, null, null, null);

            function ResHandle(err,res) {
                if(err) cb(err,null);
                if(res.result.length==0) {//if no records match return
                    cb(null,true);
                } else {
                    //construct the array ids
                    var ids = res.result.records.map(function (c) {
                        return c.id;
                    });
                    //delete
                    self._delete(model,desAllResHandle,'unlink',ids);
                }

                function desAllResHandle(err,res) {
                    if(err) cb(err, null);
                    cb(null,res.result);
                }
            }
        })

    };


    Odoo.prototype.save = function (model, data, options, cb) {
        //todo: implement save have not done yet
        console.log('save');

        model = model.replace('_','.');

        var self = this;

        model = model.replace('_','.');

        this.connect(function (err, response, sid) {
            if(err) cb(err, null);

            if (response.result.uid) {
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }

            self._write(model,saveResHandle,'write',1);

            function saveResHandle(err, res) {
                if(err) cb(err,null);
                cb(null, res.result);
            }
        });

    };


    Odoo.prototype.update =
        Odoo.prototype.updateAll = function (model, where, data, options, cb) {
        //todo: add error handle
        console.log('update');
        var self = this;

            model = model.replace('_','.');

        where = self._buildWhere(model,where);

        this.connect(function (err, response, sid) {
            if(err) cb(err, null);

            if(response.result.uid) {
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }

            self._search(model, UpResHandle, where, {id:true}, null, null, null);

            function UpResHandle(err,res) {
                if(err) cb(err,null);
                if(res.result.length ==0){
                    cb(null, true);
                }else {

                    var ids = res.result.records.map(function (c) {
                        return c.id;
                    });

                    var updateArgs = [];

                    updateArgs.push([ids,data]);

                    self._write(model,updateResHandle,'write',updateArgs);
                }

                function updateResHandle(err, res) {
                    if(err) cb(err, null);
                    cb(null,res.result);
                }
            }
        })
    };


    Odoo.prototype.destroy = function (model, id, options, cb) {
        //todo: add unit test(which kind of loopback method will call this?)
        console.log('destroy');
        var self = this;

        model = model.replace('_','.');

        this.connect(function (err, response, sid) {
            if (err) cb(err, null);
            // console.dir(response.result);

            if (response.result.uid) {
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }

            self._delete(model,desResHandle,'unlink',id);

            function desResHandle(err,res) {
                if(err) cb(err,null);
                cb(null,res.result);
            }
        });

    };


    Odoo.prototype.replaceById = function (model, id, data, options, cb) {
        console.log('replaceById');
        cb(null, 'success')
    };


    Odoo.prototype.updateAttributes = function (model, id, data, options, cb) {
        console.log('updateAttributes');
        var self = this;

        model = model.replace('_','.');

        this.connect(function (err, response, sid) {
            if(err) cb(err, null);

            if(response.result.uid) {
                self.session_id = response.result.session_id;
                self.sid = sid;
                self.context = response.result.user_context;
            }

            var updateArgs = [];

            updateArgs.push([id,data]);

            self._write(model,updateAttResHandle,'write',updateArgs);

            function updateAttResHandle(err, res) {
                if(err) cb(err, null);
                cb(null,res.result);
            }

        });
    };


    return Odoo;
})();
