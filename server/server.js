
var module = require("./server-nknz");
var app = new module.Ink();
app.SetConfig({
    "ListenPort"   : 1056
});
app.Startup();