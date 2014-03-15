/*------------------------*/
/*        Jok Play        */
/*           by           */
/*    Jok Entertainers    */
/*------------------------*/
class Helper {

    public static IO;

    static pluginHttp;
    static pluginSendgrid;


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
}


interface Array {
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