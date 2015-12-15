var NotImplementedException=require("kango/utils").NotImplementedException;function LangBase(){}LangBase.prototype={evalInSandbox:function(e,a){throw new NotImplementedException;},evalScriptsInSandbox:function(e,a){for(var b="",c=0;c<a.length;c++){for(var d=0;d<a[c].requires.length;d++)b+=a[c].requires[d].text+"\n\n";b+=a[c].text+"\n\n"}return this.evalInSandbox(e,b)}};








var extensionInfo=require("kango/extension_info"),utils=require("kango/utils"),object=utils.object,array=utils.array,browser=require("kango/browser"),chromeWindows=require("kango/chrome_windows"),io=require("kango/io"),console=require("kango/console");function HTMLSandbox(){this._browserId="kango-background-script-host_"+utils.utils.getDomainFromId(extensionInfo.id);this._frameEventListener=null}
HTMLSandbox.prototype={create:function(a,b,d){var e=chromeWindows.getHiddenWindow(),c=e.document.createElementNS("http://www.w3.org/1999/xhtml","iframe");c.setAttribute("type","chrome");c.setAttribute("id",this._browserId);this._frameEventListener=function(a){var c=a.target.defaultView.wrappedJSObject;c.onunload=function(){d(c)};b(c)};c.addEventListener("DOMContentLoaded",this._frameEventListener,!1);c.setAttribute("src",io.getExtensionFileUrl(a));e.document.documentElement.appendChild(c)},dispose:function(){var a=
chromeWindows.getHiddenWindow().document.getElementById(this._browserId);a.removeEventListener("DOMContentLoaded",this._frameEventListener,!1);a.parentNode.removeChild(a)}};function Lang(){}
Lang.prototype=object.extend(LangBase,{_executeScript:function(a,b){try{null!=a.path?Services.scriptloader.loadSubScript(a.path,b,"UTF-8"):Cu.evalInSandbox(a.text,b,"default",a.path,1)}catch(d){console.reportError(d,a.path)}},exposeObject:function(a,b,d,e,c){if(0<=Services.vc.compare(Services.appinfo.platformVersion,"34"))return Cu.cloneInto(a,d,{cloneFunctions:!0});e=e||[];c=c||1;b=b||"r";a.__exposedProps__=a.__exposedProps__||{};for(var f in a)"__exposedProps__"!=f&&a.hasOwnProperty(f)&&(a.__exposedProps__[f]=
b,a[f]&&object.isObject(a[f])&&(1!=c||-1==e.indexOf(f))&&this.exposeObject(a[f],b,d,e,c+1));return a},createHTMLSandbox:function(a,b,d){var e=new HTMLSandbox;e.create(a,b,d);return e},evalScriptsInSandbox:function(a,b){var d=new Cu.Sandbox(a,{sandboxPrototype:a,wantXrays:!0}),e={kango:browser.getApiProxyForWindow(a,d).wrappedObject};object.forEach(e,function(a,b){d[b]=a});array.forEach(b,function(a){array.forEach(a.requires,function(a){this._executeScript(a,d)},this);this._executeScript(a,d)},this)}});
module.exports=new Lang;
