var g_Connected = false;//服务器准备
var g_Host = "localhost";
var g_Port = 1056;




var u_stats = 0;//基本信息
var Dname = ["越界", "至尊", "爆炸", "THE ", "死亡", "茉莉", "农夫", "八云", "山地", "╭ァ下①站", "椒盐"];
var Fname = ["儿子", "旅店老板", "琪露诺", "星空", "爱丽丝", "清茶", "山泉", "灵梦", "鸡蛋", "野爪", "拖拉机"];
var u_name = Dname[Math.round(Math.random() * 10)] + Fname[Math.round(Math.random() * 10)];
var u_room = "";




var STATS_LOBBY = 0; //玩家状态
var STATS_INROOM = 1;
var STATS_INGAME = 2;




var canDraw = true;//规则限制
var isTurn = false;
var oneTurnTime = 60;




/**
 * 图形绘制
 * 建立三个对象保存图形与笔画
 * *可能需要4个来保存笔触
 * 
 * */
var canvas = $("canvas");
var c = canvas.getContext("2d");
var clickX = new Array();
var clickY = new Array();
var act = new Array();

var DrawColor = "#000000";
var DrawWidth = 5;

var print = false;
var swipecount = 0;//limit network pressure
var swipemax = 3;//higher => more pressureless , without accuratery clicks
canvas.onmousedown = function (e) {
	var m = window.event || e;
	print = true;
	if (canDraw) addClick(m.clientX - this.offsetLeft, m.clientY - this.offsetTop, 0);
	if (isTurn) app.Paint(m.clientX - this.offsetLeft, m.clientY - this.offsetTop, 0);
};
canvas.onmousemove = function (e) {
	var m = window.event || e;
	swipecount++;
	if (print && swipecount >= swipemax) {
		if (canDraw) addClick(m.clientX - this.offsetLeft, m.clientY - this.offsetTop, 1);	//true为新的点绘画
		if (isTurn) app.Paint(m.clientX - this.offsetLeft, m.clientY - this.offsetTop, 1);
		draw();
		swipecount -= swipemax;
	}
};
document.onmouseup = function () {
	print = false;
};
var addClick = function (x, y, a) {
	clickX.push(x);
	clickY.push(y);
	act.push(a);
};

var draw = function () {//渲染
	//Style setting
	c.strokeStyle = DrawColor;
	c.lineJoin = "round";
	c.lineWidth = DrawWidth;
	//for(var i = 0,l = clickX.length;i<l;i++){
	//
	var i = clickX.length - 1;
	//
	c.beginPath();
	if (act[i]) {
		c.moveTo(clickX[i - 1], clickY[i - 1]);
	} else {
		c.moveTo(clickX[i] - 1, clickY[i] - 1);
	}
	c.lineTo(clickX[i], clickY[i]);
	c.closePath();
	c.stroke();
	//}
};


var clearDraw = function () {//清空图形
	c.clearRect(0, 0, canvas.width, canvas.height);
	clickX = new Array();
	clickY = new Array();
	act = new Array();
};

/**游戏内容
 * 
 * 
 * 
 * 
 */
function $(id) { return document.getElementById(id); }

//计时功能
var intervalid = [];
var theCount = function (callback, delay) {//s
	clearInterval(intervalid[0]);
	clearTimeout(intervalid[1]);
	$("timecount").style.width = "100%";
	var nd = delay;
	$("timecount").innerHTML = nd;
	intervalid[0] = setInterval(function () {
		nd--;
		$("timecount").style.width = (100 / delay * nd) + "%";
		$("timecount").innerHTML = nd + "&nbsp";
		if (nd < 0) {
			clearInterval(intervalid[0]);
		}
	}, 1000);
	if (typeof callback == "function") {
		intervalid[1] = setTimeout(callback, delay * 1000);
	}
};
var ocmsg = function (msg, delay) {//,0 for infinity

	c.clearRect(0, 0, 998, 40);
	c.font = "20px Sans";
	c.fillStyle = "#999";
	c.fillText(msg, 10, 20);
	if (delay) {
		setTimeout(function () {
			c.clearRect(0, 0, 998, 40);
		}, delay);
	}
};

ocmsg("未进入房间，可以在这里自由画画 w", 0);


var defaultStyleList = {
	"ANS_CORRECT": "color:#e82795",
	"CHT_NORMAL": "color:#444",
	"ANS_BLOCK": "color:#BBB",
	"ANS_DEAD": "color:#bd149c",
	"CHT_INOUT": "color:#ff9fbc"
};

var nkdz = function (host, port) {//发射炮台

	var m_Host = host;
	var m_Port = port;
	var m_Events = [];
	var m_Error = "";
	var socket;
	var self = this;

	var bindEvent = function () {//一次性绑定事件
		for (var e in m_Events) {
			socket.on(e, m_Events[e]);
		}
	};
	var setError = function (err) {//设置错误
		m_Error = err;
	};

	this.getError = function () {//输出错误
		return m_Error;
	};

	this.connect = function () {//主连接启动
		if (!("io" in window)) {
			setError("io not defined");
			return false;
		}
		/*global io*/
		socket = io("http://" + m_Host + ":" + m_Port,
		//  {
		// 	transports: ['polling', 'flashsocket']
		// }
		);
		bindEvent();

		return true;
	};

	this.Login = function () {//带名称登录
		socket.emit("login", { "name": u_name });
	};

	this.Rcreat = function () {//创建房间
		socket.emit("Rcreat", { "from": "GP" });
		console.info("sent Rcreat");
	};
	this.Rfastjoin = function () {//快速加入
		socket.emit("Rfastjoin", { "from": "GP" });
		console.info("sent Rfastjoin");
	};

	this.Rjoin = function (roomid) {//加入房间
		socket.emit("Rjoin", { "roomid": roomid });
		console.info("sent Rjoin :" + roomid);
	};

	this.Wrdy = function () {//准备！
		socket.emit("Wrdy", {});
		console.info("sent RWrdy");
	};

	this.Msg = function (msg) {
		socket.emit("Msg", msg);
	};

	this.endTurn = function () {
		if (isTurn) {
			socket.emit("endTurn", {});
			theCount(0, 5);
		}
	};

	this.Paint = function (clickX, clickY, act) {//传输笔触
		socket.emit("paint", {
			"x": clickX,
			"y": clickY,
			"a": act
		});
	};

	this.cgCW = function () {
		if (isTurn) {
			socket.emit("cgCW", {
				"color": DrawColor,
				"width": DrawWidth
			});
		}
	};

	this.on = function (event, callback) {//接受事件
		m_Events[event] = callback;
		return self;
	};
};



var app = new nkdz(g_Host, g_Port);//创建系统



//接受事件列表.begin
app.on("paint", function (data) {//输入绘画信息
	addClick(data.x, data.y, data.a);
	draw();
}).on("roomRefresh", function (data) {//刷新房间列表
	$("Rooms").innerHTML = "";
	for (var num in data) {
		var c = document.createElement("div");
		c.setAttribute("class", "Rtname");
		c.innerHTML = data[num].name;

		var ct = document.createElement("div");
		ct.setAttribute("class", "Rtag");

		ct.appendChild(c);
		$("Rooms").appendChild(ct);
		if (data[num].nplayer >= 8) {
			c.classList.add("RTNfull");
		} else {
			ct.onclick = (function () { app.Rjoin(data[num].roomid) });
		}
	}
}).on("joinRoom", function (data) {//加入房间
	u_stats = STATS_INROOM;

	//turn
	$("ingame").classList.add("hidden");
	$("roomselect").classList.add("hidden");
	$("waiting").classList.remove("hidden");
	$("gamemode").classList.add("importants");

	console.info("joined! :" + data.roomid);
	ocmsg("等待所有人的准备", 0);
}).on("UpdateRoomInfo", function (data) {//刷新房间信息
	console.info(data);
	document.getElementsByTagName("title")[0].innerHTML = data.name + " - Nekonazo 0";
	var es = document.getElementsByClassName("Rname");
	for (var e in es) {
		es[e].innerHTML = data.name;
	}
	if (u_stats == STATS_INROOM) {
		$("Wnames").innerHTML = "";
		for (var a = 0; a < 8; a++) {
			var cr = document.createElement("div");
			cr.setAttribute("class", "namecard");
			if (data.players[a].seat) {
				cr.innerHTML = data.players[a].name;
				if (data.players[a].isrdy) {
					cr.classList.add("Wrdy");
				}
			} else {
				cr.innerHTML = "未入座";
				cr.classList.add("Wempty");
			}
			var ct = document.createElement("div");
			ct.setAttribute("class", "Wtag");
			ct.appendChild(cr);
			$("Wnames").appendChild(ct);
		}
	} else if (u_stats == STATS_INGAME) {
		$("Gnames").innerHTML = "";
		for (var a = 0; a < 8; a++) {
			var cr = document.createElement("div");
			cr.setAttribute("class", "Gnc");
			if (data.players[a].seat) {
				cr.innerHTML = data.players[a].name;
				if (data.players[a].isTurn) {
					cr.classList.add("Gturn");
				}
			}
			var ct = document.createElement("div");
			ct.setAttribute("class", "Gtag");
			ct.appendChild(cr);
			$("Gnames").appendChild(ct);
		}
	}
}).on("gamestart", function (e) {//开始游戏
	//turn
	$("ingame").classList.remove("hidden");
	$("roomselect").classList.add("hidden");
	$("waiting").classList.add("hidden");
	$("gamemode").classList.remove("importants");
	ocmsg("游戏开始辣！", 4000);
	//
	u_stats = STATS_INGAME;
	$("nazos").classList.remove("Nhidden");

	theCount(0, 5);

}).on("gameend", function (data) {//退回准备界面
	ocmsg("Game End! / * code:" + data.ref + " * /", 5000);
	$("ingame").classList.add("hidden");
	$("roomselect").classList.add("hidden");
	$("waiting").classList.remove("hidden");
	$("gamemode").classList.add("importants");
	u_stats = STATS_INROOM;
	console.info("game end!");
	if (!isTurn) clearDraw();
	isTurn = false;
	canDraw = true;
	$("nazos").classList.add("Nhidden");
	theCount(0, 1);


}).on("onTurn", function () {//你的回合
	DrawColor = "#000000";
	DrawWidth = 5;

	ocmsg("你的回合！", 15000);
	canDraw = true;
	$("Gmsgbox").innerHTML = "";
	isTurn = true;

	$("gamemode").classList.remove("importants");
	clearDraw();
	///////////////
	theCount(app.endTurn, oneTurnTime);

}).on("nextTurn", function () {//他人回合
	DrawColor = "#000000";
	DrawWidth = 5;
	$("Gmsgbox").innerHTML = "";
	isTurn = false;

	clearDraw();
	///////////////
	canDraw = false;
	$("gamemode").classList.add("importants");
	theCount(0, oneTurnTime);

}).on("msg", function (data) {//接受信息
	///////////////
	clearInterval(intervalid[2]);
	var cr = document.createElement("p");
	cr.setAttribute("style", defaultStyleList[data.sty]);
	cr.setAttribute("class", "Gmsgc");
	cr.innerHTML = data.msg;
	$("Gmsgbox").appendChild(cr);
	$("gamemode").classList.add("importants");
	if (isTurn) {
		intervalid[2] = setTimeout(function () {
			$("gamemode").classList.remove("importants");
		}, 2000);
	}
	$("Gmsgbox").scrollTop = $("Gmsgbox").scrollHeight;

}).on("syncNazo", function (data) {//异步揭示谜底
	//////////////
	$("nazo").innerHTML = data.nazo;
	$("tips").innerHTML = data.tips;

}).on("TurnEnd", function () {
	theCount(0, 5);

}).on("CgCW", function (data) {
	DrawColor = data.color;
	DrawWidth = data.width;

});

if (app.connect()) {//连接服务器
	g_Connected = true;
	console.info("connected " + g_Host + ":" + g_Port);
	app.Login();
}

var DrawWidthTemp = 5;
var OnColor = function (styStr) {
	if (canDraw) {
		DrawWidth = DrawWidthTemp;
		DrawColor = styStr;
		app.cgCW();
	}
};

var OnWidth = function (styStr) {
	if (canDraw) {
		DrawWidth = styStr;
		DrawWidthTemp = DrawWidth;
		app.cgCW();
	}
};
var OnEraser = function () {
	if (canDraw) {
		DrawColor = "#FFFFFF";
		//DrawWidthTemp=DrawWidth;
		DrawWidth = 30;
		app.cgCW();
	}
};

$("Gmsg").onkeydown = function (e) {//打字机
	e = e || window.event;
	if ($("Gmsg").value != "" && e.keyCode == 13) {
		app.Msg($("Gmsg").value);
		$("Gmsg").value = "";//清空打字机
	}
};