var Helper = (function () {
    function Helper() {
    }
    Helper.SendMail = function (to, subject, body) {
        try  {
            if (!Helper.pluginSendgrid) {
                var sendgrid = require('sendgrid');
                if (sendgrid)
                    Helper.pluginSendgrid = sendgrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
            }
        } catch (err) {
            return;
        }

        if (!Helper.pluginSendgrid)
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

        Helper.pluginSendgrid.send(sendObject, errorSending);
    };

    Helper.HttpGet = function (url, cb, parseJson) {
        if (typeof parseJson === "undefined") { parseJson = false; }
        try  {
            if (!Helper.pluginHttp) {
                Helper.pluginHttp = require('http');
            }
        } catch (err) {
            return;
        }

        if (!Helper.pluginHttp)
            return;

        Helper.pluginHttp.get(url, function (res) {
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

    Helper.ChannelSockets = function (channel) {
        if (!Helper.IO || !Helper.IO.adapter)
            return;

        var channelClients = Helper.IO.adapter().clients(channel);
        var result = [];

        for (var id in channelClients) {
            var client_sid = channelClients[id];

            if (!client_sid)
                continue;

            var socket = Helper.IO.clients[client_sid];
            if (!socket)
                continue;

            result.push(socket);
        }

        return result;
    };

    Helper.BuildCommand = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        return JSON.stringify({
            command: command,
            params: params
        });
    };
    return Helper;
})();
var GameTableBase = (function () {
    function GameTableBase(Channel, Mode) {
        if (typeof Channel === "undefined") { Channel = ''; }
        if (typeof Mode === "undefined") { Mode = 0; }
        this.Channel = Channel;
        this.Mode = Mode;
        this.Players = [];
    }
    GameTableBase.prototype.join = function (user, ipaddress, channel, mode) {
    };

    GameTableBase.prototype.leave = function (userid) {
    };

    GameTableBase.prototype.send = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        this.Players.forEach(function (p) {
            return p.send(command, params);
        });
    };
    return GameTableBase;
})();

var GamePlayerBase = (function () {
    function GamePlayerBase() {
    }
    GamePlayerBase.prototype.send = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        var sockets = Helper.ChannelSockets('User' + this.UserID);
        if (!sockets)
            return;

        sockets.forEach(function (s) {
            return s.send(Helper.BuildCommand(command, params));
        });
    };
    return GamePlayerBase;
})();
var engine = require('engine.io');
var engineRooms = require('engine.io-rooms');
var http = require('http');
var urlParser = require('url');

var Server = (function () {
    function Server(port) {
        if (typeof port === "undefined") { port = process.env.PORT || 9003; }
        var _this = this;
        this.port = port;
        this.GameTables = [];
        this.UsersCount = 0;
        var server = http.createServer(this.httpHandler.bind(this));
        this.io = engine.attach(server);

        this.io = engineRooms(this.io);

        Helper.IO = this.io;

        this.StartTime = Date.now();

        this.io.on('connection', this.onConnectionOpen.bind(this));

        server.listen(this.port, function () {
            console.log('server listening at port:', _this.port);
        });

        Helper.SendMail('status-update@jok.io', 'jok-realtime-server started', 'StartTime: ' + new Date());
    }
    Server.prototype.httpHandler = function (req, res) {
        var urlInfo = urlParser.parse(req.url, true);

        switch (urlInfo.pathname) {
            case '/stats':
                 {
                    res.end(JSON.stringify({
                        ConnectionsCount: this.io.clientsCount,
                        UsersCount: this.UsersCount,
                        TablesCount: this.GameTables.length,
                        Uptime: (Date.now() - this.StartTime) / (1000 * 60) + ' min.'
                    }));
                }
                break;

            default:
                 {
                    res.end('Hi, Bye');
                }
                break;
        }
    };

    Server.prototype.onConnectionOpen = function (socket) {
        var _this = this;
        console.log('shemovida connection');

        var sid = socket.request.query.token;
        var gameid = socket.request.query.gameid;
        var gamemode = socket.request.query.gamemode;
        var channel = socket.request.query.channel;
        var ipaddress = socket.request.headers["x-forwarded-for"];

        if (ipaddress) {
            var list = ipaddress.split(",");
            ipaddress = list[list.length - 1];
        } else {
            ipaddress = socket.request.connection.remoteAddress;
        }

        if (!sid || !ipaddress || !gameid)
            return;

        var userid;
        var disconnected;
        var gameTable;

        var url = Server.API_ROOT_URL + 'User/InfoBySID?sid=' + sid + '&ipaddress=' + ipaddress + '&gameid=' + gameid;

        Helper.HttpGet(url, function (isSuccess, data) {
            if (!isSuccess || !data.UserID || disconnected)
                return;

            userid = data.UserID;

            _this.UsersCount++;

            var userChannel = 'User' + userid;
            var oldConnections = Helper.ChannelSockets(userChannel);
            socket.join(userChannel);

            if (oldConnections)
                oldConnections.forEach(function (c) {
                    return c.close();
                });

            gameTable = _this.findTable(data, channel, gamemode);
            if (!gameTable) {
                console.log('GameTable not found, it must not happen. Passed parameters:', channel, gamemode);
                return;
            }
            gameTable.join(data, ipaddress, channel, gamemode);

            socket.send(Helper.BuildCommand('UserAuthenticated', userid));
        }, true);

        socket.on('message', function (msg) {
            if (!userid || !gameTable || !msg)
                return;

            try  {
                if (typeof msg == 'string')
                    msg = JSON.parse(msg);
            } catch (err) {
            }

            var command = msg.command;
            var params = msg.params;

            if (!command) {
                console.log('Every message must have  "command" and optionaly "params" properties');
                return;
            }

            if (typeof gameTable[command] != 'function') {
                console.log('GameTable method not found with name:', command);
                return;
            }

            gameTable[command].apply(gameTable, params);
        });

        socket.on('close', function () {
            disconnected = true;

            if (!userid)
                return;

            _this.UsersCount--;

            gameTable && gameTable.leave(userid);
        });
    };

    Server.prototype.findTable = function (user, channel, mode) {
        var table = this.GameTables.filter(function (t) {
            return t.Players.filter(function (p) {
                return p.UserID == user.UserID;
            })[0] != undefined;
        })[0];
        if (table)
            return table;

        table = this.GameTables.filter(function (t) {
            return t.Channel == channel;
        })[0];
        if (table)
            return table;

        if (!this.createTable)
            return;

        return this.createTable(user, channel, mode);
    };

    Server.prototype.createTable = function (user, channel, mode) {
        return new GameTableBase(channel, mode);
    };

    Server.Start = function (port) {
        return new Server(port);
    };
    Server.API_ROOT_URL = 'http://api.jok.io/';
    return Server;
})();

exports.Server = Server.Start;
exports.Helper = Helper;
exports.GameTableBase = GameTableBase;
exports.GameTableBase = GamePlayerBase;
//# sourceMappingURL=App.js.map
