exports.Ink = function(){

    let m_Config = {
        "ListenPort"   : 8080
    };
    
let STATS_LOBBY = 0;
let STATS_INROOM = 1;
let STATS_INGAME = 2;

let ROOM_WAITING = 10;
let ROOM_GAMING = 11;

let END_NOMORE = 20;
let END_NORMAL = 21;

let ERR_FULROM = 30;

    let m_Connections = [];
    let m_Rooms = [];

    let n_Clients = 0;

    //let self = this;
    let io;//socket.io
    
    


    this.SetConfig = function(cfg) {
        m_Config.ListenPort = cfg.ListenPort;
    };

    this.Startup = function(){
        io = require("socket.io").listen(m_Config.ListenPort);
        io.on("connection",function(socket) {
            socket.on("login",onLogin);
            socket.on("paint",onPaint);
            socket.on("disconnect",onClose);

            socket.on("Rcreat",onRcreat);
            socket.on("Rfastjoin",onRfastjoin);
            socket.on("Rjoin",onRjoin);

            socket.on("Wrdy",onWrdy);

            socket.on("Msg",onMsg);
            socket.on("endTurn",onEndTurn);
            socket.on("cgCW",onCgCW);
        });
        console.log("[INFO] Server stared at Port: " + m_Config.ListenPort);
        console.log("== NOTES ==\n\
M : Member Changing\n\
R : Room Changing\n\
 +o Login\n\
 -o Logout\n\
o>o joinRoom\n\
o$o Rdy for Start\n\
o@o join a Stated Room\n\
===========");
initWords();
    };
    let onLogin = function(data){
        m_Connections[this.id] = {
            "id":this.id,
            "name":data.name,
            "socket":this,
            "stats":STATS_LOBBY,
            "roomid":"",
            "isrdy":false,
            "c":false
        };
        console.info("M: +"+this.id);
        n_Clients++;
        RoomRefresh(this.id);
    };

    let onClose = function(){
        if(m_Connections[this.id]!=undefined){
            if(m_Connections[this.id].stats==STATS_INROOM) {
                let roomid = m_Connections[this.id].roomid;
                m_Rooms[roomid].nplayer --;
            
                if ( m_Rooms[roomid].nplayer <= 0) {//房间没人了就删除房间
                    delete m_Rooms[roomid];
                    RoomRefresh();
                } else {
                    for(let you in m_Rooms[roomid].players){//把自己踢出房间
                        if(m_Rooms[roomid].players[you].id == this.id){
                            delete m_Rooms[roomid].players[you];
                            break;
                        }
                    }
                    UpdateRoomInfo(roomid);
                }
            }else if( m_Connections[this.id].stats == STATS_INGAME ) {
                let roomid = m_Connections[this.id].roomid;
                m_Rooms[roomid].nplayer--;
                if (m_Connections[this.id].c){
                    m_Rooms[roomid].cplayer--;
                }
                let shouldNextTurn=false;
                if (m_Rooms[roomid].cplayer>=m_Rooms[roomid].nplayer && !m_Connections[this.id].isTurn){
                    shouldNextTurn=true;
                }
                for(let you in m_Rooms[roomid].players){//把自己踢出房间
                    if(m_Rooms[roomid].players[you].id == this.id){
                        delete m_Rooms[roomid].players[you];
                    }else{
                        m_Rooms[roomid].players[you].socket.emit("msg",{
                            "msg":m_Connections[this.id].name+" 退出了游戏",
                            "sty":"CHT_INOUT"
                        });
                        if(shouldNextTurn){
                            m_Rooms[roomid].players[you].socket.emit("msg",{
                                "msg":" 本局结束w，5秒后进入下一局",
                                "sty":"ANS_CORRECT"
                            });
                            setNextTurn(roomid);
                        }
                    }
                }
                
                if(m_Rooms[roomid].nplayer <= 1){
                    m_Rooms[roomid].stats = ROOM_WAITING;
                    for(let one in m_Rooms[roomid].players){
                        if(m_Rooms[roomid].players[one] != undefined){
                            m_Rooms[roomid].players[one].socket.emit("gameend",{"ref":END_NOMORE});
                            m_Rooms[roomid].players[one].isrdy = false;
                            m_Rooms[roomid].players[one].stats = STATS_INROOM;
                            break;
                        }
                    }
                }
                if (m_Connections[this.id].isTurn){
                    setNextTurn(roomid);
                }
                UpdateRoomInfo(roomid);
            //只有1人结束游戏，退到房间等待区
            }

            console.info("M: -"+this.id+">"+m_Connections[this.id].roomid);
            delete m_Connections[this.id];
            n_Clients--; 
        }
    };

    let onPaint = function(data){
        let roomid=m_Connections[this.id].roomid;
        for(let ids in m_Rooms[roomid].players){
            if (m_Rooms[roomid].players[ids].id != this.id){
                m_Rooms[roomid].players[ids].socket.emit("paint",{
                    "x":data.x,
                    "y":data.y,
                    "a":data.a
                });
            }
        }
    };

    let onRcreat = function(data){//创建房间
        let roomid = this.id;
        m_Rooms[roomid] = {
            "roomid":roomid,
            "name":m_Connections[this.id].name + " 的房间",
            "players":[],
            "nplayer":1,
            "cplayer":0,//游戏中猜对的玩家
            "stats":ROOM_WAITING,
            "word":{},
            "turn":-1,
            "Tem":true
        };
        m_Connections[this.id].stats = STATS_INROOM;
        m_Connections[this.id].roomid = roomid;
        push8(m_Connections[this.id],m_Rooms[roomid].players);
        //send msg : update room info
        let players = [];
        for(let inp in m_Rooms[roomid].players){
            players.push({
                "name":m_Rooms[roomid].players[inp].name,
                "isrdy":m_Rooms[roomid].players[inp].isrdy
            });
        }
        this.emit("joinRoom",{
            "roomid":roomid,
        });
        RoomRefresh(0);
        UpdateRoomInfo(roomid);
    };

    let onRfastjoin = function(){//快速加入
        for(var irid in m_Rooms){
            if(m_Rooms[irid].nplayer<8 && m_Rooms[irid].stats==ROOM_WAITING){
                //join room
                push8(m_Connections[this.id],m_Rooms[irid].players);
                m_Rooms[irid].nplayer++;
                m_Connections[this.id].roomid = irid;
                m_Connections[this.id].stats  = STATS_INROOM;
                this.emit("joinRoom",{
                    "roomid":irid,
                });
                UpdateRoomInfo(irid);
                console.info("R:  "+this.id+">"+m_Connections[this.id].roomid);
                return true;
            }
        }
        this.emit("err",{"err":ERR_FULROM});
    };

    let onRjoin = function(data){//加入房间
        if(m_Connections[this.id].stats == STATS_LOBBY){
            let roomid = data.roomid;
            if (m_Rooms[roomid].nplayer<8){
                //join
                push8(m_Connections[this.id],m_Rooms[roomid].players);
                m_Rooms[roomid].nplayer++;
                m_Connections[this.id].roomid = roomid;
                m_Connections[this.id].stats  = STATS_INROOM;
                this.emit("joinRoom",{
                    "roomid":roomid,
                });
                if(m_Rooms[roomid].stats == ROOM_GAMING){
                    m_Connections[this.id].isrdy = true;
                    m_Connections[this.id].stats = STATS_INGAME;
                    this.emit("gamestart",{});
                    console.info("R:  "+this.id+"@"+m_Connections[this.id].roomid);
                    this.emit("nextTurn",{});
                    for(let inp in m_Rooms[roomid].players){
                        m_Rooms[roomid].players[inp].socket.emit("msg",{
                            "msg":m_Connections[this.id].name+" 加入了游戏~",
                            "sty":"CHT_INOUT"
                        });
                    }
                    this.emit("syncNazo",{
                        "nazo":"______",
                        "tips":m_Rooms[roomid].word.tips
                    });
                }else{
                    console.info("M:  "+this.id+">"+m_Connections[this.id].roomid);
                }
                UpdateRoomInfo(roomid);
                
            }else{
                this.emit("err",{"err":ERR_FULROM});
            }

        }
    };

    let onWrdy = function(){//准备
        m_Connections[this.id].isrdy = m_Connections[this.id].isrdy == true ? false : true;
        //check room ready
        let roomid = m_Connections[this.id].roomid;
        let Rcount=0;
        for(var inp in m_Rooms[roomid].players){
            if(m_Rooms[roomid].players[inp].isrdy) Rcount++;
        }        
        if(Math.floor(m_Rooms[roomid].nplayer) <= Rcount && m_Rooms[roomid].nplayer>1){
            //roomstart
            m_Rooms[roomid].stats = ROOM_GAMING;
            for(let inp in m_Rooms[roomid].players){
                m_Rooms[roomid].players[inp].stats = STATS_INGAME;
                m_Rooms[roomid].players[inp].socket.emit("gamestart",{});
                console.info("R: +"+this.id+"$"+m_Connections[this.id].roomid);
            }
            setNextTurn(roomid);
        }
        UpdateRoomInfo(roomid);
    };

    let RoomRefresh = function(toid){
        let data = [];
        for(let rid in m_Rooms){
            data.push({
                "roomid":m_Rooms[rid].roomid,
                "name":m_Rooms[rid].name,
                "nplayer":m_Rooms[rid].nplayer,
            });
        }if(toid){
            m_Connections[toid].socket.emit("roomRefresh",data);
        }else{
            for (let ids in m_Connections){
                if(m_Connections[ids].stats == STATS_LOBBY){
                    m_Connections[ids].socket.emit("roomRefresh",data);
                }
            }
        }
    };

    let UpdateRoomInfo = function(roomid){
        let players = [];
        for(let inp = 0 ;inp < 8 ;inp++){
            if(m_Rooms[roomid].players[inp] != undefined){
                players.push({
                    "seat":true,
                    "name":m_Rooms[roomid].players[inp].name,
                    "isrdy":m_Rooms[roomid].players[inp].isrdy,
                    "isTurn":m_Rooms[roomid].players[inp].isTurn,
                });
            }else{
                players.push({"seat":false});
            }
        }
        for(let inp in m_Rooms[roomid].players){    
            m_Rooms[roomid].players[inp].socket.emit("UpdateRoomInfo",{
                "roomid":roomid,
                "name":m_Rooms[roomid].name,
                "players":players
            });
        }
    };
    let push8 = function(e,target){
            for(let a = 0 ;a < 8 ;a++){
                if (target[a] == undefined){
                    target[a] =e;
                    return true;
                }
            }
        return false;
    };




//IN GAME
    let Wordss = [];
    let initWords = function(){
        let fs = require("fs");
        //let wordslists = JSON.parse(fs.readFileSync("words/_lists.json"));
        //for (let name in wordslists){
        //    Wordss.push(JSON.parse(fs.readFileSync("words/"+wordslists[name]+".json")))
        //}
        Wordss = JSON.parse(fs.readFileSync("./words/words_1.json"));
    };
    let getNextPlayer = function(roomid){
        if(m_Rooms[roomid]!=undefined){
            let p=m_Rooms[roomid].turn;
            if(m_Rooms[roomid].nplayer>1){
                while(true){
                    p++;
                    if(p > 7) p -= 8;
                    if(m_Rooms[roomid].players[p]!=undefined){
                        return p;
                    }
                }
            }
        }
    };
    let onMsg = function(msg){
        let roomid=m_Connections[this.id].roomid;
        let returnMsg="";
        let returnSty="";//对话框样式 reffer conn.js/defaultStyleList
        if(msg.indexOf(m_Rooms[roomid].word.nazo)>=0 && m_Rooms[roomid].Tem){

            if(!m_Connections[this.id].c){
                returnMsg=m_Connections[this.id].name+" 猜对了答案w";
                m_Rooms[roomid].cplayer++;
                m_Connections[this.id].c=true;
                if(m_Rooms[roomid].cplayer ==m_Rooms[roomid].nplayer-1){
                    setNextTurn(roomid);
                    returnMsg=returnMsg+"<br/>本局结束w，5秒后进入下一局";
                }
                this.emit("syncNazo",{
                        "nazo":m_Rooms[roomid].word.nazo,
                        "tips":m_Rooms[roomid].word.tips
                    });
                returnSty="ANS_CORRECT";
            }else{
                returnMsg=m_Connections[this.id].name+": (已屏蔽)";
                returnSty="ANS_BLOCK";
            }
        }else{
            returnMsg=m_Connections[this.id].name+": "+msg;
            returnSty="CHT_NORMAL";
        }
        for (let inp in m_Rooms[roomid].players){
            m_Rooms[roomid].players[inp].socket.emit("msg",{
                "msg":returnMsg,
                "sty":returnSty
            });
        }
    };

    let onEndTurn = function(){
        let roomid =m_Connections[this.id].roomid;
        for (let inp in m_Rooms[roomid].players){
            m_Rooms[roomid].players[inp].socket.emit("msg",{
                "msg":m_Connections[this.id].name+" 选择死亡",
                "sty":"ANS_DEAD"
            });
        }
        setNextTurn(roomid);
    };
    let setNextTurn = function(roomid){
        
        for(let inp in m_Rooms[roomid].players){
            m_Rooms[roomid].players[inp].socket.emit("syncNazo",{
                "nazo":m_Rooms[roomid].word.nazo||"",
                "tips":m_Rooms[roomid].word.tips||""
            });
            m_Rooms[roomid].players[inp].socket.emit("TurnEnd");
        }
        m_Rooms[roomid].Tem = false;
        setTimeout(function() {
            m_Rooms[roomid].Tem = true;
          m_Rooms[roomid].cplayer=0;
            try{
            m_Rooms[roomid].word=getNewWord(m_Rooms[roomid].word);
            m_Rooms[roomid].turn = getNextPlayer(roomid);
            for(let inp in m_Rooms[roomid].players){
                if (inp==m_Rooms[roomid].turn){
                    m_Rooms[roomid].players[inp].isTurn=true;
                    m_Rooms[roomid].players[inp].socket.emit("onTurn",{});
                    m_Rooms[roomid].players[inp].socket.emit("syncNazo",{
                        "nazo":m_Rooms[roomid].word.nazo,
                        "tips":m_Rooms[roomid].word.tips
                    });
                }else {
                    m_Rooms[roomid].players[inp].isTurn=false;
                    m_Rooms[roomid].players[inp].socket.emit("nextTurn",{});
                    m_Rooms[roomid].players[inp].socket.emit("syncNazo",{
                        "nazo":"______",
                        "tips":m_Rooms[roomid].word.tips+" ("+m_Rooms[roomid].word.nazo.length+"个字)"//word count???
                    });
                }
                m_Rooms[roomid].players[inp].c=false;
            }
            UpdateRoomInfo(roomid);}catch(e){console.info("R: No such Room for setNextTurn()")}
        }, 5000);
    };
    let getNewWord = function(){//in [0]
        return Wordss[Math.round(Math.random() * (Wordss.length - 1))];
    };


    let onCgCW = function(data){
        let roomid = m_Connections[this.id].roomid;
        for( let inp in m_Rooms[roomid].players){
            if(m_Rooms[roomid].players[inp].id != this.id){
                m_Rooms[roomid].players[inp].socket.emit("CgCW",{
                    "color":data.color,
                    "width":data.width
                });
            }
        }
    }
};