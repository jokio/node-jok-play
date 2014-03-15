var Jok;
(function (Jok) {
    var Server = (function () {
        function Server() {
        }
        return Server;
    })();
    Jok.Server = Server;
})(Jok || (Jok = {}));
var JP = (function () {
    function JP() {
    }
    JP.SendMail = function (to, subject, body) {
        try  {
            if (!JP.pluginSendgrid) {
                var sendgrid = require('sendgrid');
                if (sendgrid)
                    JP.pluginSendgrid = sendgrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
            }
        } catch (err) {
            return;
        }

        if (!JP.pluginSendgrid)
            return;

        var sendObject = {
            to: to,
            from: 'no-reply@jok.io',
            subject: subject,
            text: body
        };

        var errorSending = function (err, json) {
            if (err) {
                return console.error('Sendmail failed', err);
            }
        };

        JP.pluginSendgrid.send(sendObject, errorSending);
    };

    JP.HttpGet = function (url, cb, parseJson) {
        if (typeof parseJson === "undefined") { parseJson = false; }
        try  {
            if (!JP.pluginHttp) {
                JP.pluginHttp = require('http');
            }
        } catch (err) {
            return;
        }

        if (!JP.pluginHttp)
            return;

        JP.pluginHttp.get(url, function (res) {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('end', function () {
                if (parseJson) {
                    try  {
                        var oldData = data;
                        data = JSON.parse(data);
                    } catch (err) {
                        cb && cb(false, err.message, oldData);
                    }
                }

                cb && cb(true, data);
            });
        }).on('error', function (e) {
            cb && cb(false, e.message, e);
        });
    };

    JP.ChannelSockets = function (channel) {
        if (!JP.IO || !JP.IO.adapter)
            return;

        var channelClients = JP.IO.adapter().clients(channel);
        var result = [];

        for (var id in channelClients) {
            var client_sid = channelClients[id];

            if (!client_sid)
                continue;

            var socket = JP.IO.clients[client_sid];
            if (!socket)
                continue;

            result.push(socket);
        }

        return result;
    };

    JP.BuildCommand = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        return JSON.stringify({
            command: command,
            params: params
        });
    };
    return JP;
})();
//# sourceMappingURL=App.js.map
