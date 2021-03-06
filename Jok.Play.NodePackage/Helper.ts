/*------------------------*/
/*        Jok Play        */
/*           by           */
/*    Jok Entertainers    */
/*------------------------*/
class Helper {

    public static IO;

    static pluginHttp;
    static pluginSendgrid;
    static pluginMongojs;


    public static SendMail(to: string, subject: string, body: string) {

        try {
            if (!Helper.pluginSendgrid) {
                var sendgrid = require('sendgrid');
                if (sendgrid)
                    Helper.pluginSendgrid = sendgrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
            }
        }
        catch (err) { return; }

        if (!Helper.pluginSendgrid) return;


        var sendObject = {
            to: to,
            from: 'no-reply@jok.io',
            subject: subject,
            text: body
        };

        var errorSending = (err, json) => {
            if (err) { return console.error('Sendmail failed', err); }
        };

        Helper.pluginSendgrid.send(sendObject, errorSending);
    }

    public static HttpGet(url: string, cb, parseJson = false) {

        try {
            if (!Helper.pluginHttp) {
                Helper.pluginHttp = require('http');
            }
        }
        catch (err) { return; }

        if (!Helper.pluginHttp) return;


        Helper.pluginHttp.get(url, function (res) {

            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('end', function () {
                // Success Result Callback

                if (parseJson) {
                    try {
                        var oldData = data;
                        data = JSON.parse(data);
                    }
                    catch (err) {
                        // Fail Result Callback
                        cb && cb(false, err.message, oldData);
                    }
                }

                cb && cb(true, data);
            });

        }).on('error', function (e) {
                // Fail Result Callback
                cb && cb(false, e.message, e);
            });

    }

    public static ChannelSockets(channel: string): any[] {

        if (!Helper.IO || !Helper.IO.adapter) return;

        var channelClients = Helper.IO.adapter().clients(channel);
        var result = [];

        for (var id in channelClients) {

            var client_sid = channelClients[id];

            if (!client_sid) continue;

            var socket = Helper.IO.clients[client_sid];
            if (!socket) continue;

            result.push(socket);
        }

        return result;
    }

    public static SaveErrorLog(err) {

        try {
            if (!Helper.pluginMongojs) {
                Helper.pluginMongojs = require('mongojs');
            }
        }
        catch (err) { return; }


        if (!process.env.MONGOHQ_URL) return;

        try {
            var db = Helper.pluginMongojs(process.env.MONGOHQ_URL, ['ErrorLog']);

            db.ErrorLog.save({
                Error: err,
                Stack: err.stack,
                CreateDate: Date.now()
            }, err => err && console.log(err));

        }
        catch (err) { console.log(err); }
    }

    public static FinishGame(obj, cb) {

        try {
            if (!Helper.pluginHttp) {
                Helper.pluginHttp = require('http');
            }
        }
        catch (err) { return; }

        var userString = JSON.stringify(obj);

        var headers = {
            'Content-Type': 'application/json',
            'Content-Length': userString.length
        };

        var options = {
            hostname: 'api.jok.io',
            port: 80,
            path: '/game/finish',
            method: 'POST',
            headers: headers
        };

        var req = Helper.pluginHttp.request(options, function (res) {
            var result = '';

            res.setEncoding('utf8');
            res.on('data', chunk => result += chunk);

            res.on('end', () => {
                try {
                    result = JSON.parse(result);
                }
                catch (err) {
                }

                cb && cb(null, result);
            });
        });

        req.on('error', err => cb && cb(err));

        req.write(userString);
        req.end();
    }
}


interface Array<T> {
    unique(): any[];
    contains(v): boolean;
    remove(item: any): boolean;
}

Array.prototype.unique = function () {
    var arr = [];
    for (var i = 0; i < this.length; i++) {
        if (!arr.contains(this[i])) {
            arr.push(this[i]);
        }
    }
    return arr;
}

Array.prototype.contains = function (v) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === v) return true;
    }
    return false;
};

Array.prototype.remove = function (item) {

    var index = this.indexOf(item);
    if (index == -1)
        return false;

    this.splice(index, 1);
    return true;
};