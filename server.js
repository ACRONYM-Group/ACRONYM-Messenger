var WebSocket = require('websocket').server;
var http = require('http');
var crypt = require('./crypt.js');
var sha256 = require('js-sha3').sha3_256;
const express = require('express');
const app = express();

var totalMessagesReceived = 0;


app.get('/', (req, res) => {
    res.send('Hello from App Engine! I have received ' + totalMessagesReceived + " Messages");
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
  });

function getNetworkInfo(connection, index) {
    if (connection.currentlyAuthenticated) {
        console.log("Returning " + index + " from " + connection.NetID);
        return networks[connection.NetID][index];
    } else {
        console.log("Auth Failed.");
    }
}

function setNetworkInfo(connection, index, data) {
    if (connection.currentlyAuthenticated) {
        networks[connection.NetID][index] = data;
    }
}

function encryptNetworkArray(data, key) {
    //indices = data.keys();
    newArray = {};

    for (var index in data) {
        newArray[crypt.encrypt(index, key)] = crypt.encrypt(JSON.stringify(data[index]), key);
    }


    return newArray;


}

function createNetworkValue(index, data, users) {
    return [index, new NetworkValue(data, users)];
}

function createEncryptedNetworkValue(index, data, users, key) {
    return [crypt.encrypt(index, key), new NetworkValue(crypt.encrypt(data, key), users)];
}

function checkConnections() {
    for (var index in networks) {
        for (var i in networks[index].activeClients) {
            var currentTime = new Date().getTime();
            if (networks[index].activeClients[i] != undefined) {
                if (networks[index].activeClients[i]["lastContact"] < currentTime - 15000) {
                    networks[index].activeClients[i]["connectionReference"].close();
                    console.log("One of " + networks[index].activeClients[i]["connectionReference"].username + "'s computers just timed out.");
                    delete networks[index].activeClients[i];
                    sendUserStatus();
                }
            }

            if (networks[index].activeClients[i] != undefined) {
                if (networks[index].activeClients[i]["lastContact"] == undefined) {
                    networks[index].activeClients[i]["connectionReference"].close();
                    console.log("One of " + networks[index].activeClients[i]["connectionReference"].username + "'s computers just timed out. No heartbeat was ever received.");
                    delete networks[index].activeClients[i];
                    sendUserStatus();
                }
            }
        }
    }
}

function sendUserStatus() {
    for (var index in networks) {
        for (var i in networks[index].activeClients) {
            console.log("sending user status update");
            networks[index].activeClients[i]["connectionReference"].send(crypt.encrypt(JSON.stringify({"type":"userStatus", "data":networks[index].users}), 12345678910))
        }
    }
}


class NetworkValue {
    constructor(data, users) {
        this.data = data;
        this.users = users;
        this.subscribers = [];
    }
}

class Network {
    constructor(name, users, admins) {
        this.name = name;
        this.users = users;
        this.admins = admins;
        this.activeClients  = {};
        this.values = {};
    }

    add(index, data, users) {
        var indexDataPair = createNetworkValue(index, data, users);

        index = indexDataPair[0];
        data = indexDataPair[1];

        this.values[index] = data;
    }

    addEnc(index, data, users, key) {
        data = JSON.stringify(data);
        var indexDataPair = createEncryptedNetworkValue(index, data, users, key);

        index = indexDataPair[0];
        data = indexDataPair[1];

        this.values[index] = data;
    }

    addPair(indexDataPair) {
        index = indexDataPair[0];
        data = indexDataPair[1];

        this.values[index] = data;
    }

    updateValue(index, data) {
        console.log("Updating " + index + " to " + data);
        this.values[index].data = data;

        console.log(this.values[index].subscribers)

        
        for (var i in this.values[index].subscribers) {
            if (this.activeClients[this.values[index].subscribers[i]["connectionID"]] != undefined) {
                console.log("Sending updated data to " + this.activeClients[this.values[index].subscribers[i]["connectionID"]]["connectionReference"]);
                this.activeClients[this.values[index].subscribers[i]["connectionID"]]["connectionReference"].send(crypt.encrypt(JSON.stringify({"type":"networkValue", "index":index, "data":data}), 12345678910));
            } else {
                this.values[index].subscribers.splice(i, 1);
            }
        }

    }
}

var AlphaNet = new Network("AlphaNet", {"Jordan":{"LastContact":0}, "Dev":{"LastContact":0}, "Carter":{"LastContact":0}, "Rochester":{"LastContact":0}, "Ethan":{"LastContact":0}, "Ian":{"LastContact":0}, "Ewan":{"LastContact":0}, "Jordin":{"LastContact":0}, "Acrobot":{"LastContact":0}}, ["Jordan"]);

AlphaNet.addEnc("config", {'name':'AlphaNet', 'defaultConv':'OHMS Development'}, {'Jordan':['read', 'write'], 'Everyone':['read']}, 31403);
AlphaNet.addEnc("topicList", {'list':{'general':{}, 'programming':{}}}, {'Jordan':['read', 'write'], 'Everyone':['read', 'write']}, 31403);
AlphaNet.addEnc("conversationList", {"Pizza":{"topic":"general", "recentMessages":{}, "banner":"<h3 style='color:red; margin-top:2px;'>Pizza</h3>"}, "OHMS Development":{"topic":"programming", "recentMessages":{}, "banner":"<h3 style='color:red; margin-top:2px;'>OHMS Development</h3>"}, "AMPS Development":{"topic":"programming", "recentMessages":{}, "banner":"<h3 style='color:red; margin-top:2px;'>AMPS Development</h3>"}}, {'Jordan':['read', 'write'], 'Everyone':['read', 'write']}, 31403);

AlphaNet.addEnc("convCounter-OHMS Development", {'id':1}, {'Jordan':['read', 'write'], 'Everyone':['read']}, 31403);
AlphaNet.addEnc("convCounter-AMPS Development", {'id':0}, {'Jordan':['read', 'write'], 'Everyone':['read']}, 31403);
AlphaNet.addEnc("convCounter-Pizza", {'id':0}, {'Jordan':['read', 'write'], 'Everyone':['read']}, 31403);

AlphaNet.addEnc("Chat-Pizza-0", {'text':'<div style=\'color:red;\'>Welcome to AlphaNet.</div>', 'sender':'Server'}, {'Jordan':['read', 'write'], 'Everyone':['read']}, 31403);
AlphaNet.addEnc("Chat-OHMS Development-0", {'text':'So... I\'m making a Chat client...', 'sender':'Jordan'}, {'Jordan':['read', 'write'], 'Everyone':['read']}, 31403);
AlphaNet.addEnc("Chat-OHMS Development-1", {'text':'It\'s pretty cool so far.', 'sender':'Jordan'}, {'Jordan':['read', 'write'], 'Everyone':['read']}, 31403);
AlphaNet.addEnc("Chat-AMPS Development-0", {'text':'<div style=\'color:red\'> AMPS Dev Coversation</div>', 'sender':'Server'}, {'Jordan':['read', 'write'], 'Everyone':['read']}, 31403);


var networks = {
    "AlphaNet":AlphaNet
}

var users = [
    {
        "username": "Jordan",
        "password": "73899d2adaad774417b0208da85162b61c8dbdf79bb0f7108c2686b93721d1f4"
    },
    {
        "username": "DevPerson",
        "password": "73899d2adaad774417b0208da85162b61c8dbdf79bb0f7108c2686b93721d1f4"
    },
    {
        "username": "Dev",
        "password": "73899d2adaad774417b0208da85162b61c8dbdf79bb0f7108c2686b93721d1f4"
    }
]



var server = http.createServer(function(request, response) {

});

server.listen(8080, function() {

});

var wsServer = new WebSocket({
    httpServer: server
});

wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);

    connection.on('message', function(message) {
        totalMessagesReceived += 1;
        if (message.type === 'utf8') {
            //console.log(message);
            decryptedMsg = crypt.decrypt(message["utf8Data"], 12345678910);
            //console.log(message);
            //console.log("Decrypted: ");
            //console.log( decryptedMsg );
            connection.send(message["utf8Data"]);
            //console.log(" ");

            msg = JSON.parse(decryptedMsg);

            if (msg["type"] == "login") {
                if (networks[msg["NetID"]] != undefined) {
                    var foundUser = false;
                    var userID = 0;
                    console.log(msg["username"] + " attempting Login to " + msg["NetID"]);

                    for (var i = 0; i < users.length; i++) {
                        if (msg["username"].toLowerCase() == users[i]["username"].toLowerCase()) {
                            foundUser = true;
                            userID = i;
                        }
                    }

                    var networkContainsUser = false;
                    var usernames = [];
                    for (var index in networks[msg["NetID"]].users) {
                        usernames.push(index);
                    }
                    if (usernames.includes(msg["username"])) {
                        networkContainsUser = true;
                        console.log("   User found");
                        
                        console.log("      Authenticating with " + sha256(msg["password"]));
                        if (sha256(msg["password"]) == users[userID]["password"]) {
                            console.log("      Authentication Successful");
                            connection.currentlyAuthenticated = true;
                            connection.username = msg["username"];
                            connection.NetID = msg["NetID"];

                            connection.send(crypt.encrypt(JSON.stringify({"type":"authResult", "result":true}), 12345678910))
                            setTimeout(sendUserStatus, 1000);

                            numActiveConnections = 0;
                            for (var index in networks[msg["NetID"]].activeClients) {
                                numActiveConnections += 1;
                            }
                            connection.activeClientsID = numActiveConnections;

                            networks[msg["NetID"]].activeClients[connection.activeClientsID] = {"connectionReference":connection};
                        } else {
                            console.log("      Authentication Failed");
                            connection.send(crypt.encrypt(JSON.stringify({"type":"authResult", "result":false, "reason": "You have failed to Authenticate to " + msg["NetID"] + "."}), 12345678910))
                            connection.currentlyAuthenticated = false;
                            connection.NetID = msg["NetID"];
                        }   
                    }

                    if (networkContainsUser) {
                        if (!foundUser) {
                            console.log("   WARNING! Network " + msg["NetID"] + " contains User " + msg["username"] + ", but User does not Exist.");
                            connection.send(crypt.encrypt(JSON.stringify({"type":"networkConfig", "data":{"name":"Auth Failed"}}), 12345678910))
                            connection.send(crypt.encrypt(JSON.stringify({"type":"recentHistory", "data":[{"text":"The Authentication proccess has failed. The Network recognizes you, but the Auth Server has no record of your Username. This Event, your entered username, the NetID, and related Meta Data have been logged. Contact Jordan.", "sender":"Auth Server"}]}), 12345678910))
                        }
                    } else {
                        if (!foundUser) {
                            console.log("   User does not exist on Network or Auth Server");
                            connection.send(crypt.encrypt(JSON.stringify({"type":"networkConfig", "data":{"name":"Auth Failed"}}), 12345678910))
                            connection.send(crypt.encrypt(JSON.stringify({"type":"recentHistory", "data":[{"text":"You're username does not exist on the Auth Server, aborting connection to Network.", "sender":"Auth Server"}]}), 12345678910))
                        } else {
                            console.log("   User is not a member of the network.");
                            connection.send(crypt.encrypt(JSON.stringify({"type":"networkConfig", "data":{"name":"Auth Failed"}}), 12345678910))
                            connection.send(crypt.encrypt(JSON.stringify({"type":"recentHistory", "data":[{"text":"You have failed to Authenticate to " + msg["NetID"] + ".", "sender":"Auth Server"}]}), 12345678910))
                    
                        }
                        
                    }

                } else {
                    connection.send(crypt.encrypt(JSON.stringify({"type":"networkConfig", "data":{"name":"NetID 404"}}), 12345678910))
                        connection.send(crypt.encrypt(JSON.stringify({"type":"recentHistory", "data":[{"text":msg["NetID"] + " does not exist.", "sender":"Auth Server"}]}), 12345678910))
                }
            } else if (msg["type"] == "createNetwork") {


            } else if (connection.currentlyAuthenticated == true) {
                var allowRequest = false
                if (msg["NetID"] != undefined) {
                    var usernames = [];
                    for (var index in networks[msg["NetID"]].users) {
                        usernames.push(index);
                    }
                    if (usernames.includes(connection.username)) {
                        allowRequest = true;
                    }
                } else {
                    allowRequest = true;
                }
                
                if (allowRequest) {
                    if (msg["type"] == "newChat") {
                        var netInfo = getNetworkInfo(connection, "recentHistory");
                        netInfo.push(msg["chatData"]);
                        setNetworkInfo(connection, "recentHistory", netInfo);

                        for (var i = 0; i < networks[msg["NetID"]].activeClients.length; i++) {
                            getNetworkInfo(connection, "activeClients")[i]["connectionReference"].send(crypt.encrypt(JSON.stringify({"type":"newChats", "data":msg["chatData"]}), 12345678910));
                        }
                    } else if (msg["type"] == "requestValue") {

                        //console.log("Requesting: " + networks[connection.NetID].values[msg["index"]]);
                        var dataToSend = networks[connection.NetID].values[msg["index"]].data;
                        connection.send(crypt.encrypt(JSON.stringify({"type":"networkValue", "index":msg["index"], "data":dataToSend}), 12345678910));
                    } else if (msg["type"] == "setValue") {
                        console.log(" ");
                        console.log("attempting to set " + msg["index"]);
                        if (networks[connection.NetID].values[msg["index"]] == undefined) {
                            console.log("Value doesn't exist");
                            networks[connection.NetID].add(msg["index"], msg["data"], "{" + connection.username + ":\"[\"write\", \"read\"]\", \"everyone\":\"[\"read\"]\"");
                        } else {
                            console.log("Value does exist");
                            console.log(networks[connection.NetID].values[msg["index"]]);
                            if (networks[connection.NetID].values[msg["index"]].users[connection.username] != undefined) {
                                console.log("   User has some permissions");
                                if (networks[connection.NetID].values[msg["index"]].users[connection.username].includes("write")) {
                                    console.log("      User has write permission");
                                    networks[connection.NetID].updateValue(msg["index"], msg["data"]);
                                }
                            } else if (networks[connection.NetID].values[msg["index"]].users["Everyone"] != undefined) {
                                console.log("   User has some permissions");
                                if (networks[connection.NetID].values[msg["index"]].users["Everyone"].includes("write")) {
                                    console.log("      User has write permission");
                                    networks[connection.NetID].updateValue(msg["index"], msg["data"]);
                                }
                            }
                        }
                    } else if (msg["type"] == "subToValue") {
                        console.log("User is subbing to " + msg["index"]);
                        networks[connection.NetID].values[msg["index"]].subscribers.push({"name":connection.username, "connectionID": connection.activeClientsID});
                    } else if (msg["type"] == "endSub") {
                        for (var index in networks[connection.NetID].values[msg["index"]].subscribers) {
                            if (networks[connection.NetID].values[msg["index"]].subscribers[index]["name"] == connection.username) {
                                networks[connection.NetID].values[msg["index"]].subscribers.splice(index, 1);
                            }
                        }
                    } else if (msg["type"] == "HB") {
                        var currentTime = new Date().getTime();
                        networks[connection.NetID].users[connection.username]["lastContact"] = currentTime;
                        networks[connection.NetID].activeClients[connection.activeClientsID]["lastContact"] = currentTime;
                    }
                }
            }
        }
    });
});

setInterval(checkConnections, 5000);
setInterval(sendUserStatus, 15000);

console.log("Server started.");
