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
    return Helper;
})();

Array.prototype.unique = function () {
    var arr = [];
    for (var i = 0; i < this.length; i++) {
        if (!arr.contains(this[i])) {
            arr.push(this[i]);
        }
    }
    return arr;
};

Array.prototype.contains = function (v) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === v)
            return true;
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
var GamePlayerBase = (function () {
    function GamePlayerBase(UserID, IPAddress, IsVIP, IsOnline) {
        this.UserID = UserID;
        this.IPAddress = IPAddress;
        this.IsVIP = IsVIP;
        this.IsOnline = IsOnline;
        this.HasAnyMoveMade = false;
    }
    GamePlayerBase.prototype.send = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        var sockets = Helper.ChannelSockets('User' + this.UserID);
        if (!sockets)
            return;

        params.unshift(command);

        var cmd = JSON.stringify(params);

        sockets.forEach(function (s) {
            return s.send(cmd);
        });
    };
    return GamePlayerBase;
})();
var GameTableBase = (function () {
    function GameTableBase(GamePlayerClass, Channel, Mode, MaxPlayersCount, IsVIPTable) {
        if (typeof Channel === "undefined") { Channel = ''; }
        if (typeof Mode === "undefined") { Mode = 0; }
        if (typeof MaxPlayersCount === "undefined") { MaxPlayersCount = 2; }
        if (typeof IsVIPTable === "undefined") { IsVIPTable = false; }
        this.GamePlayerClass = GamePlayerClass;
        this.Channel = Channel;
        this.Mode = Mode;
        this.MaxPlayersCount = MaxPlayersCount;
        this.IsVIPTable = IsVIPTable;
        this.Status = 0 /* New */;
        this.Players = [];
    }
    GameTableBase.prototype.join = function (user, ipaddress, channel, mode) {
        var player = this.Players.filter(function (p) {
            return p.UserID == user.UserID;
        })[0];
        if (!player)
            player = new this.GamePlayerClass(user.UserID, ipaddress, user.IsVIP, true);

        player.IsOnline = true;

        switch (this.Status) {
            case 0 /* New */:
                 {
                    if (!this.Players.contains(player)) {
                        this.Players.push(player);
                        this.playersChanged();
                    }

                    if (this.Players.length == this.MaxPlayersCount) {
                        this.start();
                    }
                }
                break;

            case 1 /* Started */:
            case 2 /* StartedWaiting */:
                 {
                    if (!this.Players.contains(player))
                        return;

                    this.Status = 1 /* Started */;
                    this.playersChanged();
                }
                break;

            default:
                return;
        }
    };

    GameTableBase.prototype.leave = function (userid) {
        var player = this.Players.filter(function (p) {
            return p.UserID == userid;
        })[0];
        if (player == null)
            return;

        player.IsOnline = false;

        switch (this.Status) {
            case 0 /* New */:
                 {
                    this.Players.remove(player);
                    this.playersChanged();
                }
                break;

            case 1 /* Started */:
                 {
                    if (this.Players.filter(function (p) {
                        return p.HasAnyMoveMade;
                    }).length != 2) {
                        this.Status = 0 /* New */;
                        this.Players.remove(player);
                        this.playersChanged();
                        break;
                    }

                    this.Status = 2 /* StartedWaiting */;
                    this.playersChanged();
                }
                break;

            case 3 /* Finished */:
                 {
                    this.Players.remove(player);
                    this.playersChanged();
                }
                break;

            default:
                return;
        }
    };

    GameTableBase.prototype.start = function () {
    };

    GameTableBase.prototype.finish = function () {
    };

    GameTableBase.prototype.playersChanged = function () {
    };

    GameTableBase.prototype.send = function (command) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
        }
        params.unshift(command);

        this.Players.forEach(function (p) {
            return p.send.apply(p, params);
        });
    };

    GameTableBase.prototype.getNextPlayer = function (player) {
        if (this.Players.length <= 1)
            return;

        if (!player)
            player = this.ActivePlayer;

        if (!player)
            return;

        var index = this.Players.indexOf(player);

        return this.Players[index < this.Players.length - 1 ? ++index : 0];
    };
    return GameTableBase;
})();

var TableStatus;
(function (TableStatus) {
    TableStatus[TableStatus["New"] = 0] = "New";
    TableStatus[TableStatus["Started"] = 1] = "Started";
    TableStatus[TableStatus["StartedWaiting"] = 2] = "StartedWaiting";
    TableStatus[TableStatus["Finished"] = 3] = "Finished";
})(TableStatus || (TableStatus = {}));
var engine = require('engine.io');
var engineRooms = require('engine.io-rooms');
var http = require('http');
var urlParser = require('url');

var Server = (function () {
    function Server(port, GameTableClass, GamePlayerClass) {
        if (typeof port === "undefined") { port = process.env.PORT || 9003; }
        var _this = this;
        this.port = port;
        this.GameTableClass = GameTableClass;
        this.GamePlayerClass = GamePlayerClass;
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
        var sid = socket.request.query.token;
        var gameid = socket.request.query.gameid;
        var gamemode = socket.request.query.gamemode;
        var channel = socket.request.query.channel;
        var ipaddress = socket.request.headers["x-forwarded-for"];

        if (!channel)
            channel = '';

        channel = channel.toLowerCase();

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

            socket.send(JSON.stringify(['UserAuthenticated', userid]));

            gameTable.join(data, ipaddress, channel, gamemode);
        }, true);

        socket.on('message', function (msg) {
            if (!userid || !gameTable || !msg)
                return;

            try  {
                if (typeof msg == 'string')
                    msg = JSON.parse(msg);
            } catch (err) {
            }

            if (Object.prototype.toString.call(msg) !== '[object Array]') {
                return;
            }

            if (!msg.length)
                return;

            var command = msg.shift();
            var params = msg;

            if (!command) {
                console.log('Every message must have  "command" and optionaly "params" properties');
                return;
            }

            var reservedWords = ['Join', 'Leave'];
            if (command in reservedWords) {
                console.log('Reserved words cant be used as command:', reservedWords);
                return;
            }

            command = 'on' + command;

            if (typeof gameTable[command] != 'function') {
                console.log('GameTable method not found with name:', command);
                return;
            }

            params.unshift(userid);

            gameTable[command].apply(gameTable, params);
        });

        socket.on('close', function () {
            disconnected = true;

            if (!userid)
                return;

            _this.UsersCount--;

            gameTable && gameTable.leave(userid);

            if (!gameTable.Players.length) {
                var index = _this.GameTables.indexOf(gameTable);

                if (index > -1)
                    _this.GameTables.splice(index, 1);
            }
        });
    };

    Server.prototype.findTable = function (user, channel, mode) {
        var _this = this;
        var table = this.GameTables.filter(function (t) {
            return (t.Players.filter(function (p) {
                return p.UserID == user.UserID;
            })[0] != undefined) && (t.Status == 1 /* Started */ || t.Status == 2 /* StartedWaiting */) && (t.Status != 3 /* Finished */);
        })[0];
        if (table)
            return table;

        table = this.GameTables.filter(function (t) {
            return t.Channel == channel && t.Mode == mode && t.Players.length < t.MaxPlayersCount && (t.Status != 1 /* Started */) && (t.Status != 3 /* Finished */) && _this.isTournamentValid(channel, t, user);
        })[0];
        if (table)
            return table;

        if (!this.createTable)
            return;

        table = this.createTable(user, channel, mode);
        if (!table)
            return;

        this.GameTables.push(table);

        return table;
    };

    Server.prototype.createTable = function (user, channel, mode) {
        return new this.GameTableClass(this.GamePlayerClass, channel, mode, 2, this.isTournamentChannel(channel) ? user.IsVIP : false);
    };

    Server.prototype.isTournamentValid = function (channel, table, user) {
        if (!this.isTournamentChannel(channel))
            return true;

        return (user.IsVIP == table.IsVIPTable);
    };

    Server.prototype.isTournamentChannel = function (channel) {
        return (channel == 'tournament');
    };

    Server.Start = function (port, TGameTable, TGamePlayerClass) {
        return new Server(port, TGameTable, TGamePlayerClass);
    };
    Server.API_ROOT_URL = 'http://api.jok.io/';
    return Server;
})();

exports.Server = Server;
exports.Helper = Helper;
exports.GameTableBase = GameTableBase;
exports.GamePlayerBase = GamePlayerBase;
exports.TableStatus = TableStatus;
//# sourceMappingURL=App.js.map
