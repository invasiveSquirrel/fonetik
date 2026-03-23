import { i as e, t } from "./chunk-BQCxAhux.js";
//#region node_modules/ms/index.js
var n = /* @__PURE__ */ t(((e, t) => {
	var n = 1e3, r = n * 60, i = r * 60, a = i * 24, o = a * 7, s = a * 365.25;
	t.exports = function(e, t) {
		t ||= {};
		var n = typeof e;
		if (n === "string" && e.length > 0) return c(e);
		if (n === "number" && isFinite(e)) return t.long ? u(e) : l(e);
		throw Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(e));
	};
	function c(e) {
		if (e = String(e), !(e.length > 100)) {
			var t = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(e);
			if (t) {
				var c = parseFloat(t[1]);
				switch ((t[2] || "ms").toLowerCase()) {
					case "years":
					case "year":
					case "yrs":
					case "yr":
					case "y": return c * s;
					case "weeks":
					case "week":
					case "w": return c * o;
					case "days":
					case "day":
					case "d": return c * a;
					case "hours":
					case "hour":
					case "hrs":
					case "hr":
					case "h": return c * i;
					case "minutes":
					case "minute":
					case "mins":
					case "min":
					case "m": return c * r;
					case "seconds":
					case "second":
					case "secs":
					case "sec":
					case "s": return c * n;
					case "milliseconds":
					case "millisecond":
					case "msecs":
					case "msec":
					case "ms": return c;
					default: return;
				}
			}
		}
	}
	function l(e) {
		var t = Math.abs(e);
		return t >= a ? Math.round(e / a) + "d" : t >= i ? Math.round(e / i) + "h" : t >= r ? Math.round(e / r) + "m" : t >= n ? Math.round(e / n) + "s" : e + "ms";
	}
	function u(e) {
		var t = Math.abs(e);
		return t >= a ? d(e, t, a, "day") : t >= i ? d(e, t, i, "hour") : t >= r ? d(e, t, r, "minute") : t >= n ? d(e, t, n, "second") : e + " ms";
	}
	function d(e, t, n, r) {
		var i = t >= n * 1.5;
		return Math.round(e / n) + " " + r + (i ? "s" : "");
	}
})), r = /* @__PURE__ */ t(((e, t) => {
	function r(e) {
		r.debug = r, r.default = r, r.coerce = l, r.disable = s, r.enable = a, r.enabled = c, r.humanize = n(), r.destroy = u, Object.keys(e).forEach((t) => {
			r[t] = e[t];
		}), r.names = [], r.skips = [], r.formatters = {};
		function t(e) {
			let t = 0;
			for (let n = 0; n < e.length; n++) t = (t << 5) - t + e.charCodeAt(n), t |= 0;
			return r.colors[Math.abs(t) % r.colors.length];
		}
		r.selectColor = t;
		function r(e) {
			let t, n = null, a, o;
			function s(...e) {
				if (!s.enabled) return;
				let n = s, i = Number(/* @__PURE__ */ new Date());
				n.diff = i - (t || i), n.prev = t, n.curr = i, t = i, e[0] = r.coerce(e[0]), typeof e[0] != "string" && e.unshift("%O");
				let a = 0;
				e[0] = e[0].replace(/%([a-zA-Z%])/g, (t, i) => {
					if (t === "%%") return "%";
					a++;
					let o = r.formatters[i];
					if (typeof o == "function") {
						let r = e[a];
						t = o.call(n, r), e.splice(a, 1), a--;
					}
					return t;
				}), r.formatArgs.call(n, e), (n.log || r.log).apply(n, e);
			}
			return s.namespace = e, s.useColors = r.useColors(), s.color = r.selectColor(e), s.extend = i, s.destroy = r.destroy, Object.defineProperty(s, "enabled", {
				enumerable: !0,
				configurable: !1,
				get: () => n === null ? (a !== r.namespaces && (a = r.namespaces, o = r.enabled(e)), o) : n,
				set: (e) => {
					n = e;
				}
			}), typeof r.init == "function" && r.init(s), s;
		}
		function i(e, t) {
			let n = r(this.namespace + (t === void 0 ? ":" : t) + e);
			return n.log = this.log, n;
		}
		function a(e) {
			r.save(e), r.namespaces = e, r.names = [], r.skips = [];
			let t = (typeof e == "string" ? e : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
			for (let e of t) e[0] === "-" ? r.skips.push(e.slice(1)) : r.names.push(e);
		}
		function o(e, t) {
			let n = 0, r = 0, i = -1, a = 0;
			for (; n < e.length;) if (r < t.length && (t[r] === e[n] || t[r] === "*")) t[r] === "*" ? (i = r, a = n, r++) : (n++, r++);
			else if (i !== -1) r = i + 1, a++, n = a;
			else return !1;
			for (; r < t.length && t[r] === "*";) r++;
			return r === t.length;
		}
		function s() {
			let e = [...r.names, ...r.skips.map((e) => "-" + e)].join(",");
			return r.enable(""), e;
		}
		function c(e) {
			for (let t of r.skips) if (o(e, t)) return !1;
			for (let t of r.names) if (o(e, t)) return !0;
			return !1;
		}
		function l(e) {
			return e instanceof Error ? e.stack || e.message : e;
		}
		function u() {
			console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
		}
		return r.enable(r.load()), r;
	}
	t.exports = r;
})), i = /* @__PURE__ */ t(((e, t) => {
	e.formatArgs = i, e.save = a, e.load = o, e.useColors = n, e.storage = s(), e.destroy = (() => {
		let e = !1;
		return () => {
			e || (e = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
		};
	})(), e.colors = /* @__PURE__ */ "#0000CC.#0000FF.#0033CC.#0033FF.#0066CC.#0066FF.#0099CC.#0099FF.#00CC00.#00CC33.#00CC66.#00CC99.#00CCCC.#00CCFF.#3300CC.#3300FF.#3333CC.#3333FF.#3366CC.#3366FF.#3399CC.#3399FF.#33CC00.#33CC33.#33CC66.#33CC99.#33CCCC.#33CCFF.#6600CC.#6600FF.#6633CC.#6633FF.#66CC00.#66CC33.#9900CC.#9900FF.#9933CC.#9933FF.#99CC00.#99CC33.#CC0000.#CC0033.#CC0066.#CC0099.#CC00CC.#CC00FF.#CC3300.#CC3333.#CC3366.#CC3399.#CC33CC.#CC33FF.#CC6600.#CC6633.#CC9900.#CC9933.#CCCC00.#CCCC33.#FF0000.#FF0033.#FF0066.#FF0099.#FF00CC.#FF00FF.#FF3300.#FF3333.#FF3366.#FF3399.#FF33CC.#FF33FF.#FF6600.#FF6633.#FF9900.#FF9933.#FFCC00.#FFCC33".split(".");
	function n() {
		if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) return !0;
		if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) return !1;
		let e;
		return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator < "u" && navigator.userAgent && (e = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(e[1], 10) >= 31 || typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
	}
	function i(e) {
		if (e[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + e[0] + (this.useColors ? "%c " : " ") + "+" + t.exports.humanize(this.diff), !this.useColors) return;
		let n = "color: " + this.color;
		e.splice(1, 0, n, "color: inherit");
		let r = 0, i = 0;
		e[0].replace(/%[a-zA-Z%]/g, (e) => {
			e !== "%%" && (r++, e === "%c" && (i = r));
		}), e.splice(i, 0, n);
	}
	e.log = console.debug || console.log || (() => {});
	function a(t) {
		try {
			t ? e.storage.setItem("debug", t) : e.storage.removeItem("debug");
		} catch {}
	}
	function o() {
		let t;
		try {
			t = e.storage.getItem("debug") || e.storage.getItem("DEBUG");
		} catch {}
		return !t && typeof process < "u" && "env" in process && (t = process.env.DEBUG), t;
	}
	function s() {
		try {
			return localStorage;
		} catch {}
	}
	t.exports = r()(e);
	var { formatters: c } = t.exports;
	c.j = function(e) {
		try {
			return JSON.stringify(e);
		} catch (e) {
			return "[UnexpectedJSONParseError]: " + e.message;
		}
	};
})), a = /* @__PURE__ */ t(((e, t) => {
	t.exports = (e, t = process.argv) => {
		let n = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--", r = t.indexOf(n + e), i = t.indexOf("--");
		return r !== -1 && (i === -1 || r < i);
	};
})), o = /* @__PURE__ */ t(((t, n) => {
	var r = e("os"), i = e("tty"), o = a(), { env: s } = process, c;
	o("no-color") || o("no-colors") || o("color=false") || o("color=never") ? c = 0 : (o("color") || o("colors") || o("color=true") || o("color=always")) && (c = 1), "FORCE_COLOR" in s && (c = s.FORCE_COLOR === "true" ? 1 : s.FORCE_COLOR === "false" ? 0 : s.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(s.FORCE_COLOR, 10), 3));
	function l(e) {
		return e === 0 ? !1 : {
			level: e,
			hasBasic: !0,
			has256: e >= 2,
			has16m: e >= 3
		};
	}
	function u(e, t) {
		if (c === 0) return 0;
		if (o("color=16m") || o("color=full") || o("color=truecolor")) return 3;
		if (o("color=256")) return 2;
		if (e && !t && c === void 0) return 0;
		let n = c || 0;
		if (s.TERM === "dumb") return n;
		if (process.platform === "win32") {
			let e = r.release().split(".");
			return Number(e[0]) >= 10 && Number(e[2]) >= 10586 ? Number(e[2]) >= 14931 ? 3 : 2 : 1;
		}
		if ("CI" in s) return [
			"TRAVIS",
			"CIRCLECI",
			"APPVEYOR",
			"GITLAB_CI",
			"GITHUB_ACTIONS",
			"BUILDKITE"
		].some((e) => e in s) || s.CI_NAME === "codeship" ? 1 : n;
		if ("TEAMCITY_VERSION" in s) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(s.TEAMCITY_VERSION) ? 1 : 0;
		if (s.COLORTERM === "truecolor") return 3;
		if ("TERM_PROGRAM" in s) {
			let e = parseInt((s.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
			switch (s.TERM_PROGRAM) {
				case "iTerm.app": return e >= 3 ? 3 : 2;
				case "Apple_Terminal": return 2;
			}
		}
		return /-256(color)?$/i.test(s.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(s.TERM) || "COLORTERM" in s ? 1 : n;
	}
	function d(e) {
		return l(u(e, e && e.isTTY));
	}
	n.exports = {
		supportsColor: d,
		stdout: l(u(!0, i.isatty(1))),
		stderr: l(u(!0, i.isatty(2)))
	};
})), s = /* @__PURE__ */ t(((t, n) => {
	var i = e("tty"), a = e("util");
	t.init = p, t.log = u, t.formatArgs = c, t.save = d, t.load = f, t.useColors = s, t.destroy = a.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."), t.colors = [
		6,
		2,
		3,
		4,
		5,
		1
	];
	try {
		let e = o();
		e && (e.stderr || e).level >= 2 && (t.colors = [
			20,
			21,
			26,
			27,
			32,
			33,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			56,
			57,
			62,
			63,
			68,
			69,
			74,
			75,
			76,
			77,
			78,
			79,
			80,
			81,
			92,
			93,
			98,
			99,
			112,
			113,
			128,
			129,
			134,
			135,
			148,
			149,
			160,
			161,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			171,
			172,
			173,
			178,
			179,
			184,
			185,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			203,
			204,
			205,
			206,
			207,
			208,
			209,
			214,
			215,
			220,
			221
		]);
	} catch {}
	t.inspectOpts = Object.keys(process.env).filter((e) => /^debug_/i.test(e)).reduce((e, t) => {
		let n = t.substring(6).toLowerCase().replace(/_([a-z])/g, (e, t) => t.toUpperCase()), r = process.env[t];
		return r = /^(yes|on|true|enabled)$/i.test(r) ? !0 : /^(no|off|false|disabled)$/i.test(r) ? !1 : r === "null" ? null : Number(r), e[n] = r, e;
	}, {});
	function s() {
		return "colors" in t.inspectOpts ? !!t.inspectOpts.colors : i.isatty(process.stderr.fd);
	}
	function c(e) {
		let { namespace: t, useColors: r } = this;
		if (r) {
			let r = this.color, i = "\x1B[3" + (r < 8 ? r : "8;5;" + r), a = `  ${i};1m${t} \u001B[0m`;
			e[0] = a + e[0].split("\n").join("\n" + a), e.push(i + "m+" + n.exports.humanize(this.diff) + "\x1B[0m");
		} else e[0] = l() + t + " " + e[0];
	}
	function l() {
		return t.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
	}
	function u(...e) {
		return process.stderr.write(a.formatWithOptions(t.inspectOpts, ...e) + "\n");
	}
	function d(e) {
		e ? process.env.DEBUG = e : delete process.env.DEBUG;
	}
	function f() {
		return process.env.DEBUG;
	}
	function p(e) {
		e.inspectOpts = {};
		let n = Object.keys(t.inspectOpts);
		for (let r = 0; r < n.length; r++) e.inspectOpts[n[r]] = t.inspectOpts[n[r]];
	}
	n.exports = r()(t);
	var { formatters: m } = n.exports;
	m.o = function(e) {
		return this.inspectOpts.colors = this.useColors, a.inspect(e, this.inspectOpts).split("\n").map((e) => e.trim()).join(" ");
	}, m.O = function(e) {
		return this.inspectOpts.colors = this.useColors, a.inspect(e, this.inspectOpts);
	};
})), c = /* @__PURE__ */ t(((e, t) => {
	typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? t.exports = i() : t.exports = s();
})), l = /* @__PURE__ */ t(((t) => {
	var n = t && t.__createBinding || (Object.create ? (function(e, t, n, r) {
		r === void 0 && (r = n);
		var i = Object.getOwnPropertyDescriptor(t, n);
		(!i || ("get" in i ? !t.__esModule : i.writable || i.configurable)) && (i = {
			enumerable: !0,
			get: function() {
				return t[n];
			}
		}), Object.defineProperty(e, r, i);
	}) : (function(e, t, n, r) {
		r === void 0 && (r = n), e[r] = t[n];
	})), r = t && t.__setModuleDefault || (Object.create ? (function(e, t) {
		Object.defineProperty(e, "default", {
			enumerable: !0,
			value: t
		});
	}) : function(e, t) {
		e.default = t;
	}), i = t && t.__importStar || function(e) {
		if (e && e.__esModule) return e;
		var t = {};
		if (e != null) for (var i in e) i !== "default" && Object.prototype.hasOwnProperty.call(e, i) && n(t, e, i);
		return r(t, e), t;
	};
	Object.defineProperty(t, "__esModule", { value: !0 }), t.req = t.json = t.toBuffer = void 0;
	var a = i(e("http")), o = i(e("https"));
	async function s(e) {
		let t = 0, n = [];
		for await (let r of e) t += r.length, n.push(r);
		return Buffer.concat(n, t);
	}
	t.toBuffer = s;
	async function c(e) {
		let t = (await s(e)).toString("utf8");
		try {
			return JSON.parse(t);
		} catch (e) {
			let n = e;
			throw n.message += ` (input: ${t})`, n;
		}
	}
	t.json = c;
	function l(e, t = {}) {
		let n = ((typeof e == "string" ? e : e.href).startsWith("https:") ? o : a).request(e, t), r = new Promise((e, t) => {
			n.once("response", e).once("error", t).end();
		});
		return n.then = r.then.bind(r), n;
	}
	t.req = l;
})), u = /* @__PURE__ */ t(((t) => {
	var n = t && t.__createBinding || (Object.create ? (function(e, t, n, r) {
		r === void 0 && (r = n);
		var i = Object.getOwnPropertyDescriptor(t, n);
		(!i || ("get" in i ? !t.__esModule : i.writable || i.configurable)) && (i = {
			enumerable: !0,
			get: function() {
				return t[n];
			}
		}), Object.defineProperty(e, r, i);
	}) : (function(e, t, n, r) {
		r === void 0 && (r = n), e[r] = t[n];
	})), r = t && t.__setModuleDefault || (Object.create ? (function(e, t) {
		Object.defineProperty(e, "default", {
			enumerable: !0,
			value: t
		});
	}) : function(e, t) {
		e.default = t;
	}), i = t && t.__importStar || function(e) {
		if (e && e.__esModule) return e;
		var t = {};
		if (e != null) for (var i in e) i !== "default" && Object.prototype.hasOwnProperty.call(e, i) && n(t, e, i);
		return r(t, e), t;
	}, a = t && t.__exportStar || function(e, t) {
		for (var r in e) r !== "default" && !Object.prototype.hasOwnProperty.call(t, r) && n(t, e, r);
	};
	Object.defineProperty(t, "__esModule", { value: !0 }), t.Agent = void 0;
	var o = i(e("net")), s = i(e("http")), c = e("https");
	a(l(), t);
	var u = Symbol("AgentBaseInternalState");
	t.Agent = class extends s.Agent {
		constructor(e) {
			super(e), this[u] = {};
		}
		isSecureEndpoint(e) {
			if (e) {
				if (typeof e.secureEndpoint == "boolean") return e.secureEndpoint;
				if (typeof e.protocol == "string") return e.protocol === "https:";
			}
			let { stack: t } = /* @__PURE__ */ Error();
			return typeof t == "string" ? t.split("\n").some((e) => e.indexOf("(https.js:") !== -1 || e.indexOf("node:https:") !== -1) : !1;
		}
		incrementSockets(e) {
			if (this.maxSockets === Infinity && this.maxTotalSockets === Infinity) return null;
			this.sockets[e] || (this.sockets[e] = []);
			let t = new o.Socket({ writable: !1 });
			return this.sockets[e].push(t), this.totalSocketCount++, t;
		}
		decrementSockets(e, t) {
			if (!this.sockets[e] || t === null) return;
			let n = this.sockets[e], r = n.indexOf(t);
			r !== -1 && (n.splice(r, 1), this.totalSocketCount--, n.length === 0 && delete this.sockets[e]);
		}
		getName(e) {
			return this.isSecureEndpoint(e) ? c.Agent.prototype.getName.call(this, e) : super.getName(e);
		}
		createSocket(e, t, n) {
			let r = {
				...t,
				secureEndpoint: this.isSecureEndpoint(t)
			}, i = this.getName(r), a = this.incrementSockets(i);
			Promise.resolve().then(() => this.connect(e, r)).then((o) => {
				if (this.decrementSockets(i, a), o instanceof s.Agent) try {
					return o.addRequest(e, r);
				} catch (e) {
					return n(e);
				}
				this[u].currentSocket = o, super.createSocket(e, t, n);
			}, (e) => {
				this.decrementSockets(i, a), n(e);
			});
		}
		createConnection() {
			let e = this[u].currentSocket;
			if (this[u].currentSocket = void 0, !e) throw Error("No socket was returned in the `connect()` function");
			return e;
		}
		get defaultPort() {
			return this[u].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
		}
		set defaultPort(e) {
			this[u] && (this[u].defaultPort = e);
		}
		get protocol() {
			return this[u].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
		}
		set protocol(e) {
			this[u] && (this[u].protocol = e);
		}
	};
})), d = /* @__PURE__ */ t(((e) => {
	var t = e && e.__importDefault || function(e) {
		return e && e.__esModule ? e : { default: e };
	};
	Object.defineProperty(e, "__esModule", { value: !0 }), e.parseProxyResponse = void 0;
	var n = (0, t(c()).default)("https-proxy-agent:parse-proxy-response");
	function r(e) {
		return new Promise((t, r) => {
			let i = 0, a = [];
			function o() {
				let t = e.read();
				t ? u(t) : e.once("readable", o);
			}
			function s() {
				e.removeListener("end", c), e.removeListener("error", l), e.removeListener("readable", o);
			}
			function c() {
				s(), n("onend"), r(/* @__PURE__ */ Error("Proxy connection ended before receiving CONNECT response"));
			}
			function l(e) {
				s(), n("onerror %o", e), r(e);
			}
			function u(c) {
				a.push(c), i += c.length;
				let l = Buffer.concat(a, i), u = l.indexOf("\r\n\r\n");
				if (u === -1) {
					n("have not received end of HTTP headers yet..."), o();
					return;
				}
				let d = l.slice(0, u).toString("ascii").split("\r\n"), f = d.shift();
				if (!f) return e.destroy(), r(/* @__PURE__ */ Error("No header received from proxy CONNECT response"));
				let p = f.split(" "), m = +p[1], h = p.slice(2).join(" "), g = {};
				for (let t of d) {
					if (!t) continue;
					let n = t.indexOf(":");
					if (n === -1) return e.destroy(), r(/* @__PURE__ */ Error(`Invalid header from proxy CONNECT response: "${t}"`));
					let i = t.slice(0, n).toLowerCase(), a = t.slice(n + 1).trimStart(), o = g[i];
					typeof o == "string" ? g[i] = [o, a] : Array.isArray(o) ? o.push(a) : g[i] = a;
				}
				n("got proxy server response: %o %o", f, g), s(), t({
					connect: {
						statusCode: m,
						statusText: h,
						headers: g
					},
					buffered: l
				});
			}
			e.on("error", l), e.on("end", c), o();
		});
	}
	e.parseProxyResponse = r;
})), f = /* @__PURE__ */ t(((t) => {
	var n = t && t.__createBinding || (Object.create ? (function(e, t, n, r) {
		r === void 0 && (r = n);
		var i = Object.getOwnPropertyDescriptor(t, n);
		(!i || ("get" in i ? !t.__esModule : i.writable || i.configurable)) && (i = {
			enumerable: !0,
			get: function() {
				return t[n];
			}
		}), Object.defineProperty(e, r, i);
	}) : (function(e, t, n, r) {
		r === void 0 && (r = n), e[r] = t[n];
	})), r = t && t.__setModuleDefault || (Object.create ? (function(e, t) {
		Object.defineProperty(e, "default", {
			enumerable: !0,
			value: t
		});
	}) : function(e, t) {
		e.default = t;
	}), i = t && t.__importStar || function(e) {
		if (e && e.__esModule) return e;
		var t = {};
		if (e != null) for (var i in e) i !== "default" && Object.prototype.hasOwnProperty.call(e, i) && n(t, e, i);
		return r(t, e), t;
	}, a = t && t.__importDefault || function(e) {
		return e && e.__esModule ? e : { default: e };
	};
	Object.defineProperty(t, "__esModule", { value: !0 }), t.HttpsProxyAgent = void 0;
	var o = i(e("net")), s = i(e("tls")), l = a(e("assert")), f = a(c()), p = u(), m = e("url"), h = d(), g = (0, f.default)("https-proxy-agent"), _ = (e) => e.servername === void 0 && e.host && !o.isIP(e.host) ? {
		...e,
		servername: e.host
	} : e, v = class extends p.Agent {
		constructor(e, t) {
			super(t), this.options = { path: void 0 }, this.proxy = typeof e == "string" ? new m.URL(e) : e, this.proxyHeaders = t?.headers ?? {}, g("Creating new HttpsProxyAgent instance: %o", this.proxy.href);
			let n = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, ""), r = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
			this.connectOpts = {
				ALPNProtocols: ["http/1.1"],
				...t ? b(t, "headers") : null,
				host: n,
				port: r
			};
		}
		async connect(e, t) {
			let { proxy: n } = this;
			if (!t.host) throw TypeError("No \"host\" provided");
			let r;
			n.protocol === "https:" ? (g("Creating `tls.Socket`: %o", this.connectOpts), r = s.connect(_(this.connectOpts))) : (g("Creating `net.Socket`: %o", this.connectOpts), r = o.connect(this.connectOpts));
			let i = typeof this.proxyHeaders == "function" ? this.proxyHeaders() : { ...this.proxyHeaders }, a = o.isIPv6(t.host) ? `[${t.host}]` : t.host, c = `CONNECT ${a}:${t.port} HTTP/1.1\r\n`;
			if (n.username || n.password) {
				let e = `${decodeURIComponent(n.username)}:${decodeURIComponent(n.password)}`;
				i["Proxy-Authorization"] = `Basic ${Buffer.from(e).toString("base64")}`;
			}
			i.Host = `${a}:${t.port}`, i["Proxy-Connection"] ||= this.keepAlive ? "Keep-Alive" : "close";
			for (let e of Object.keys(i)) c += `${e}: ${i[e]}\r\n`;
			let u = (0, h.parseProxyResponse)(r);
			r.write(`${c}\r\n`);
			let { connect: d, buffered: f } = await u;
			if (e.emit("proxyConnect", d), this.emit("proxyConnect", d, e), d.statusCode === 200) return e.once("socket", y), t.secureEndpoint ? (g("Upgrading socket connection to TLS"), s.connect({
				...b(_(t), "host", "path", "port"),
				socket: r
			})) : r;
			r.destroy();
			let p = new o.Socket({ writable: !1 });
			return p.readable = !0, e.once("socket", (e) => {
				g("Replaying proxy buffer for failed request"), (0, l.default)(e.listenerCount("data") > 0), e.push(f), e.push(null);
			}), p;
		}
	};
	v.protocols = ["http", "https"], t.HttpsProxyAgent = v;
	function y(e) {
		e.resume();
	}
	function b(e, ...t) {
		let n = {}, r;
		for (r in e) t.includes(r) || (n[r] = e[r]);
		return n;
	}
}));
//#endregion
export default f();
