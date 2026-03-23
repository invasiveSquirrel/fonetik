import { n as e } from "./chunk-BQCxAhux.js";
import { i as t, n, o as r, r as i, s as a, t as o } from "./from-DuFH-e4p.js";
import s from "node:http";
import c from "node:https";
import l from "node:zlib";
import u, { PassThrough as d, pipeline as f } from "node:stream";
import { Buffer as p } from "node:buffer";
import { deprecate as m, promisify as h, types as g } from "node:util";
import { format as _ } from "node:url";
import { isIP as v } from "node:net";
//#region node_modules/data-uri-to-buffer/dist/index.js
function ee(e) {
	if (!/^data:/i.test(e)) throw TypeError("`uri` does not appear to be a Data URI (must begin with \"data:\")");
	e = e.replace(/\r?\n/g, "");
	let t = e.indexOf(",");
	if (t === -1 || t <= 4) throw TypeError("malformed data: URI");
	let n = e.substring(5, t).split(";"), r = "", i = !1, a = n[0] || "text/plain", o = a;
	for (let e = 1; e < n.length; e++) n[e] === "base64" ? i = !0 : n[e] && (o += `;${n[e]}`, n[e].indexOf("charset=") === 0 && (r = n[e].substring(8)));
	!n[0] && !r.length && (o += ";charset=US-ASCII", r = "US-ASCII");
	let s = i ? "base64" : "ascii", c = unescape(e.substring(t + 1)), l = Buffer.from(c, s);
	return l.type = a, l.typeFull = o, l.charset = r, l;
}
var y = e((() => {})), b, x = e((() => {
	b = class extends Error {
		constructor(e, t) {
			super(e), Error.captureStackTrace(this, this.constructor), this.type = t;
		}
		get name() {
			return this.constructor.name;
		}
		get [Symbol.toStringTag]() {
			return this.constructor.name;
		}
	};
})), S, te = e((() => {
	x(), S = class extends b {
		constructor(e, t, n) {
			super(e, t), n && (this.code = this.errno = n.code, this.erroredSysCall = n.syscall);
		}
	};
})), C, w, T, E, D, O, k = e((() => {
	C = Symbol.toStringTag, w = (e) => typeof e == "object" && typeof e.append == "function" && typeof e.delete == "function" && typeof e.get == "function" && typeof e.getAll == "function" && typeof e.has == "function" && typeof e.set == "function" && typeof e.sort == "function" && e[C] === "URLSearchParams", T = (e) => e && typeof e == "object" && typeof e.arrayBuffer == "function" && typeof e.type == "string" && typeof e.stream == "function" && typeof e.constructor == "function" && /^(Blob|File)$/.test(e[C]), E = (e) => typeof e == "object" && (e[C] === "AbortSignal" || e[C] === "EventTarget"), D = (e, t) => {
		let n = new URL(t).hostname, r = new URL(e).hostname;
		return n === r || n.endsWith(`.${r}`);
	}, O = (e, t) => new URL(t).protocol === new URL(e).protocol;
}));
//#endregion
//#region node_modules/node-fetch/src/body.js
async function A(e) {
	if (e[M].disturbed) throw TypeError(`body used already for: ${e.url}`);
	if (e[M].disturbed = !0, e[M].error) throw e[M].error;
	let { body: t } = e;
	/* c8 ignore next 3 */
	if (t === null || !(t instanceof u)) return p.alloc(0);
	let n = [], r = 0;
	try {
		for await (let i of t) {
			if (e.size > 0 && r + i.length > e.size) {
				let n = new S(`content size at ${e.url} over limit: ${e.size}`, "max-size");
				throw t.destroy(n), n;
			}
			r += i.length, n.push(i);
		}
	} catch (t) {
		throw t instanceof b ? t : new S(`Invalid response body while trying to fetch ${e.url}: ${t.message}`, "system", t);
	}
	if (t.readableEnded === !0 || t._readableState.ended === !0) try {
		return n.every((e) => typeof e == "string") ? p.from(n.join("")) : p.concat(n, r);
	} catch (t) {
		throw new S(`Could not create Buffer from response body for ${e.url}: ${t.message}`, "system", t);
	}
	else throw new S(`Premature close of server response while trying to fetch ${e.url}`);
}
var j, M, N, P, ne, F, re, I, L = e((() => {
	a(), t(), te(), x(), k(), j = h(u.pipeline), M = Symbol("Body internals"), N = class {
		constructor(e, { size: t = 0 } = {}) {
			let r = null;
			e === null ? e = null : w(e) ? e = p.from(e.toString()) : T(e) || p.isBuffer(e) || (g.isAnyArrayBuffer(e) ? e = p.from(e) : ArrayBuffer.isView(e) ? e = p.from(e.buffer, e.byteOffset, e.byteLength) : e instanceof u || (e instanceof n ? (e = i(e), r = e.type.split("=")[1]) : e = p.from(String(e))));
			let a = e;
			p.isBuffer(e) ? a = u.Readable.from(e) : T(e) && (a = u.Readable.from(e.stream())), this[M] = {
				body: e,
				stream: a,
				boundary: r,
				disturbed: !1,
				error: null
			}, this.size = t, e instanceof u && e.on("error", (e) => {
				let t = e instanceof b ? e : new S(`Invalid response body while trying to fetch ${this.url}: ${e.message}`, "system", e);
				this[M].error = t;
			});
		}
		get body() {
			return this[M].stream;
		}
		get bodyUsed() {
			return this[M].disturbed;
		}
		async arrayBuffer() {
			let { buffer: e, byteOffset: t, byteLength: n } = await A(this);
			return e.slice(t, t + n);
		}
		async formData() {
			let e = this.headers.get("content-type");
			if (e.startsWith("application/x-www-form-urlencoded")) {
				let e = new n(), t = new URLSearchParams(await this.text());
				for (let [n, r] of t) e.append(n, r);
				return e;
			}
			let { toFormData: t } = await import("./multipart-parser-DXwhn6Sx.js");
			return t(this.body, e);
		}
		async blob() {
			let e = this.headers && this.headers.get("content-type") || this[M].body && this[M].body.type || "";
			return new r([await this.arrayBuffer()], { type: e });
		}
		async json() {
			let e = await this.text();
			return JSON.parse(e);
		}
		async text() {
			let e = await A(this);
			return new TextDecoder().decode(e);
		}
		buffer() {
			return A(this);
		}
	}, N.prototype.buffer = m(N.prototype.buffer, "Please use 'response.arrayBuffer()' instead of 'response.buffer()'", "node-fetch#buffer"), Object.defineProperties(N.prototype, {
		body: { enumerable: !0 },
		bodyUsed: { enumerable: !0 },
		arrayBuffer: { enumerable: !0 },
		blob: { enumerable: !0 },
		json: { enumerable: !0 },
		text: { enumerable: !0 },
		data: { get: m(() => {}, "data doesn't exist, use json(), text(), arrayBuffer(), or body instead", "https://github.com/node-fetch/node-fetch/issues/1000 (response)") }
	}), P = (e, t) => {
		let n, r, { body: i } = e[M];
		if (e.bodyUsed) throw Error("cannot clone body after it is used");
		return i instanceof u && typeof i.getBoundary != "function" && (n = new d({ highWaterMark: t }), r = new d({ highWaterMark: t }), i.pipe(n), i.pipe(r), e[M].stream = n, i = r), i;
	}, ne = m((e) => e.getBoundary(), "form-data doesn't follow the spec and requires special treatment. Use alternative package", "https://github.com/node-fetch/node-fetch/issues/1167"), F = (e, t) => e === null ? null : typeof e == "string" ? "text/plain;charset=UTF-8" : w(e) ? "application/x-www-form-urlencoded;charset=UTF-8" : T(e) ? e.type || null : p.isBuffer(e) || g.isAnyArrayBuffer(e) || ArrayBuffer.isView(e) ? null : e instanceof n ? `multipart/form-data; boundary=${t[M].boundary}` : e && typeof e.getBoundary == "function" ? `multipart/form-data;boundary=${ne(e)}` : e instanceof u ? null : "text/plain;charset=UTF-8", re = (e) => {
		let { body: t } = e[M];
		return t === null ? 0 : T(t) ? t.size : p.isBuffer(t) ? t.length : t && typeof t.getLengthSync == "function" && t.hasKnownLength && t.hasKnownLength() ? t.getLengthSync() : null;
	}, I = async (e, { body: t }) => {
		t === null ? e.end() : await j(t, e);
	};
}));
//#endregion
//#region node_modules/node-fetch/src/headers.js
function ie(e = []) {
	return new B(e.reduce((e, t, n, r) => (n % 2 == 0 && e.push(r.slice(n, n + 2)), e), []).filter(([e, t]) => {
		try {
			return R(e), z(e, String(t)), !0;
		} catch {
			return !1;
		}
	}));
}
var R, z, B, V = e((() => {
	R = typeof s.validateHeaderName == "function" ? s.validateHeaderName : (e) => {
		if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(e)) {
			let t = /* @__PURE__ */ TypeError(`Header name must be a valid HTTP token [${e}]`);
			throw Object.defineProperty(t, "code", { value: "ERR_INVALID_HTTP_TOKEN" }), t;
		}
	}, z = typeof s.validateHeaderValue == "function" ? s.validateHeaderValue : (e, t) => {
		if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(t)) {
			let t = /* @__PURE__ */ TypeError(`Invalid character in header content ["${e}"]`);
			throw Object.defineProperty(t, "code", { value: "ERR_INVALID_CHAR" }), t;
		}
	}, B = class e extends URLSearchParams {
		constructor(t) {
			let n = [];
			if (t instanceof e) {
				let e = t.raw();
				for (let [t, r] of Object.entries(e)) n.push(...r.map((e) => [t, e]));
			} else if (t != null) if (typeof t == "object" && !g.isBoxedPrimitive(t)) {
				let e = t[Symbol.iterator];
				if (e == null) n.push(...Object.entries(t));
				else {
					if (typeof e != "function") throw TypeError("Header pairs must be iterable");
					n = [...t].map((e) => {
						if (typeof e != "object" || g.isBoxedPrimitive(e)) throw TypeError("Each header pair must be an iterable object");
						return [...e];
					}).map((e) => {
						if (e.length !== 2) throw TypeError("Each header pair must be a name/value tuple");
						return [...e];
					});
				}
			} else throw TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
			return n = n.length > 0 ? n.map(([e, t]) => (R(e), z(e, String(t)), [String(e).toLowerCase(), String(t)])) : void 0, super(n), new Proxy(this, { get(e, t, n) {
				switch (t) {
					case "append":
					case "set": return (n, r) => (R(n), z(n, String(r)), URLSearchParams.prototype[t].call(e, String(n).toLowerCase(), String(r)));
					case "delete":
					case "has":
					case "getAll": return (n) => (R(n), URLSearchParams.prototype[t].call(e, String(n).toLowerCase()));
					case "keys": return () => (e.sort(), new Set(URLSearchParams.prototype.keys.call(e)).keys());
					default: return Reflect.get(e, t, n);
				}
			} });
			/* c8 ignore next */
		}
		get [Symbol.toStringTag]() {
			return this.constructor.name;
		}
		toString() {
			return Object.prototype.toString.call(this);
		}
		get(e) {
			let t = this.getAll(e);
			if (t.length === 0) return null;
			let n = t.join(", ");
			return /^content-encoding$/i.test(e) && (n = n.toLowerCase()), n;
		}
		forEach(e, t = void 0) {
			for (let n of this.keys()) Reflect.apply(e, t, [
				this.get(n),
				n,
				this
			]);
		}
		*values() {
			for (let e of this.keys()) yield this.get(e);
		}
		*entries() {
			for (let e of this.keys()) yield [e, this.get(e)];
		}
		[Symbol.iterator]() {
			return this.entries();
		}
		raw() {
			return [...this.keys()].reduce((e, t) => (e[t] = this.getAll(t), e), {});
		}
		[Symbol.for("nodejs.util.inspect.custom")]() {
			return [...this.keys()].reduce((e, t) => {
				let n = this.getAll(t);
				return t === "host" ? e[t] = n[0] : e[t] = n.length > 1 ? n : n[0], e;
			}, {});
		}
	}, Object.defineProperties(B.prototype, [
		"get",
		"entries",
		"forEach",
		"values"
	].reduce((e, t) => (e[t] = { enumerable: !0 }, e), {}));
})), H, U, W = e((() => {
	H = new Set([
		301,
		302,
		303,
		307,
		308
	]), U = (e) => H.has(e);
})), G, K, ae = e((() => {
	V(), L(), W(), G = Symbol("Response internals"), K = class e extends N {
		constructor(e = null, t = {}) {
			super(e, t);
			let n = t.status == null ? 200 : t.status, r = new B(t.headers);
			if (e !== null && !r.has("Content-Type")) {
				let t = F(e, this);
				t && r.append("Content-Type", t);
			}
			this[G] = {
				type: "default",
				url: t.url,
				status: n,
				statusText: t.statusText || "",
				headers: r,
				counter: t.counter,
				highWaterMark: t.highWaterMark
			};
		}
		get type() {
			return this[G].type;
		}
		get url() {
			return this[G].url || "";
		}
		get status() {
			return this[G].status;
		}
		get ok() {
			return this[G].status >= 200 && this[G].status < 300;
		}
		get redirected() {
			return this[G].counter > 0;
		}
		get statusText() {
			return this[G].statusText;
		}
		get headers() {
			return this[G].headers;
		}
		get highWaterMark() {
			return this[G].highWaterMark;
		}
		clone() {
			return new e(P(this, this.highWaterMark), {
				type: this.type,
				url: this.url,
				status: this.status,
				statusText: this.statusText,
				headers: this.headers,
				ok: this.ok,
				redirected: this.redirected,
				size: this.size,
				highWaterMark: this.highWaterMark
			});
		}
		static redirect(t, n = 302) {
			if (!U(n)) throw RangeError("Failed to execute \"redirect\" on \"response\": Invalid status code");
			return new e(null, {
				headers: { location: new URL(t).toString() },
				status: n
			});
		}
		static error() {
			let t = new e(null, {
				status: 0,
				statusText: ""
			});
			return t[G].type = "error", t;
		}
		static json(t = void 0, n = {}) {
			let r = JSON.stringify(t);
			if (r === void 0) throw TypeError("data is not JSON serializable");
			let i = new B(n && n.headers);
			return i.has("content-type") || i.set("content-type", "application/json"), new e(r, {
				...n,
				headers: i
			});
		}
		get [Symbol.toStringTag]() {
			return "Response";
		}
	}, Object.defineProperties(K.prototype, {
		type: { enumerable: !0 },
		url: { enumerable: !0 },
		status: { enumerable: !0 },
		ok: { enumerable: !0 },
		redirected: { enumerable: !0 },
		statusText: { enumerable: !0 },
		headers: { enumerable: !0 },
		clone: { enumerable: !0 }
	});
})), q, oe = e((() => {
	q = (e) => {
		if (e.search) return e.search;
		let t = e.href.length - 1, n = e.hash || (e.href[t] === "#" ? "#" : "");
		return e.href[t - n.length] === "?" ? "?" : "";
	};
}));
//#endregion
//#region node_modules/node-fetch/src/utils/referrer.js
function J(e, t = !1) {
	return e == null || (e = new URL(e), /^(about|blob|data):$/.test(e.protocol)) ? "no-referrer" : (e.username = "", e.password = "", e.hash = "", t && (e.pathname = "", e.search = ""), e);
}
function se(e) {
	if (!X.has(e)) throw TypeError(`Invalid referrerPolicy: ${e}`);
	return e;
}
function ce(e) {
	if (/^(http|ws)s:$/.test(e.protocol)) return !0;
	let t = e.host.replace(/(^\[)|(]$)/g, ""), n = v(t);
	return n === 4 && /^127\./.test(t) || n === 6 && /^(((0+:){7})|(::(0+:){0,6}))0*1$/.test(t) ? !0 : e.host === "localhost" || e.host.endsWith(".localhost") ? !1 : e.protocol === "file:";
}
function Y(e) {
	return /^about:(blank|srcdoc)$/.test(e) || e.protocol === "data:" || /^(blob|filesystem):$/.test(e.protocol) ? !0 : ce(e);
}
function le(e, { referrerURLCallback: t, referrerOriginCallback: n } = {}) {
	if (e.referrer === "no-referrer" || e.referrerPolicy === "") return null;
	let r = e.referrerPolicy;
	if (e.referrer === "about:client") return "no-referrer";
	let i = e.referrer, a = J(i), o = J(i, !0);
	a.toString().length > 4096 && (a = o), t && (a = t(a)), n && (o = n(o));
	let s = new URL(e.url);
	switch (r) {
		case "no-referrer": return "no-referrer";
		case "origin": return o;
		case "unsafe-url": return a;
		case "strict-origin": return Y(a) && !Y(s) ? "no-referrer" : o.toString();
		case "strict-origin-when-cross-origin": return a.origin === s.origin ? a : Y(a) && !Y(s) ? "no-referrer" : o;
		case "same-origin": return a.origin === s.origin ? a : "no-referrer";
		case "origin-when-cross-origin": return a.origin === s.origin ? a : o;
		case "no-referrer-when-downgrade": return Y(a) && !Y(s) ? "no-referrer" : a;
		default: throw TypeError(`Invalid referrerPolicy: ${r}`);
	}
}
function ue(e) {
	let t = (e.get("referrer-policy") || "").split(/[,\s]+/), n = "";
	for (let e of t) e && X.has(e) && (n = e);
	return n;
}
var X, de, fe = e((() => {
	X = new Set([
		"",
		"no-referrer",
		"no-referrer-when-downgrade",
		"same-origin",
		"origin",
		"strict-origin",
		"origin-when-cross-origin",
		"strict-origin-when-cross-origin",
		"unsafe-url"
	]), de = "strict-origin-when-cross-origin";
})), Z, Q, pe, $, me, he = e((() => {
	V(), L(), k(), oe(), fe(), Z = Symbol("Request internals"), Q = (e) => typeof e == "object" && typeof e[Z] == "object", pe = m(() => {}, ".data is not a valid RequestInit property, use .body instead", "https://github.com/node-fetch/node-fetch/issues/1000 (request)"), $ = class e extends N {
		constructor(e, t = {}) {
			let n;
			if (Q(e) ? n = new URL(e.url) : (n = new URL(e), e = {}), n.username !== "" || n.password !== "") throw TypeError(`${n} is an url with embedded credentials.`);
			let r = t.method || e.method || "GET";
			if (/^(delete|get|head|options|post|put)$/i.test(r) && (r = r.toUpperCase()), !Q(t) && "data" in t && pe(), (t.body != null || Q(e) && e.body !== null) && (r === "GET" || r === "HEAD")) throw TypeError("Request with GET/HEAD method cannot have body");
			let i = t.body ? t.body : Q(e) && e.body !== null ? P(e) : null;
			super(i, { size: t.size || e.size || 0 });
			let a = new B(t.headers || e.headers || {});
			if (i !== null && !a.has("Content-Type")) {
				let e = F(i, this);
				e && a.set("Content-Type", e);
			}
			let o = Q(e) ? e.signal : null;
			if ("signal" in t && (o = t.signal), o != null && !E(o)) throw TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
			let s = t.referrer == null ? e.referrer : t.referrer;
			if (s === "") s = "no-referrer";
			else if (s) {
				let e = new URL(s);
				s = /^about:(\/\/)?client$/.test(e) ? "client" : e;
			} else s = void 0;
			this[Z] = {
				method: r,
				redirect: t.redirect || e.redirect || "follow",
				headers: a,
				parsedURL: n,
				signal: o,
				referrer: s
			}, this.follow = t.follow === void 0 ? e.follow === void 0 ? 20 : e.follow : t.follow, this.compress = t.compress === void 0 ? e.compress === void 0 ? !0 : e.compress : t.compress, this.counter = t.counter || e.counter || 0, this.agent = t.agent || e.agent, this.highWaterMark = t.highWaterMark || e.highWaterMark || 16384, this.insecureHTTPParser = t.insecureHTTPParser || e.insecureHTTPParser || !1, this.referrerPolicy = t.referrerPolicy || e.referrerPolicy || "";
		}
		get method() {
			return this[Z].method;
		}
		get url() {
			return _(this[Z].parsedURL);
		}
		get headers() {
			return this[Z].headers;
		}
		get redirect() {
			return this[Z].redirect;
		}
		get signal() {
			return this[Z].signal;
		}
		get referrer() {
			if (this[Z].referrer === "no-referrer") return "";
			if (this[Z].referrer === "client") return "about:client";
			if (this[Z].referrer) return this[Z].referrer.toString();
		}
		get referrerPolicy() {
			return this[Z].referrerPolicy;
		}
		set referrerPolicy(e) {
			this[Z].referrerPolicy = se(e);
		}
		clone() {
			return new e(this);
		}
		get [Symbol.toStringTag]() {
			return "Request";
		}
	}, Object.defineProperties($.prototype, {
		method: { enumerable: !0 },
		url: { enumerable: !0 },
		headers: { enumerable: !0 },
		redirect: { enumerable: !0 },
		clone: { enumerable: !0 },
		signal: { enumerable: !0 },
		referrer: { enumerable: !0 },
		referrerPolicy: { enumerable: !0 }
	}), me = (e) => {
		let { parsedURL: t } = e[Z], n = new B(e[Z].headers);
		n.has("Accept") || n.set("Accept", "*/*");
		let r = null;
		if (e.body === null && /^(post|put)$/i.test(e.method) && (r = "0"), e.body !== null) {
			let t = re(e);
			typeof t == "number" && !Number.isNaN(t) && (r = String(t));
		}
		r && n.set("Content-Length", r), e.referrerPolicy === "" && (e.referrerPolicy = de), e.referrer && e.referrer !== "no-referrer" ? e[Z].referrer = le(e) : e[Z].referrer = "no-referrer", e[Z].referrer instanceof URL && n.set("Referer", e.referrer), n.has("User-Agent") || n.set("User-Agent", "node-fetch"), e.compress && !n.has("Accept-Encoding") && n.set("Accept-Encoding", "gzip, deflate, br");
		let { agent: i } = e;
		typeof i == "function" && (i = i(t));
		let a = q(t);
		return {
			parsedURL: t,
			options: {
				path: t.pathname + a,
				method: e.method,
				headers: n[Symbol.for("nodejs.util.inspect.custom")](),
				insecureHTTPParser: e.insecureHTTPParser,
				agent: i
			}
		};
	};
})), ge, _e = e((() => {
	x(), ge = class extends b {
		constructor(e, t = "aborted") {
			super(e, t);
		}
	};
}));
//#endregion
//#region node_modules/node-fetch/src/index.js
async function ve(e, t) {
	return new Promise((n, r) => {
		let i = new $(e, t), { parsedURL: a, options: o } = me(i);
		if (!be.has(a.protocol)) throw TypeError(`node-fetch cannot load ${e}. URL scheme "${a.protocol.replace(/:$/, "")}" is not supported.`);
		if (a.protocol === "data:") {
			let e = ee(i.url);
			n(new K(e, { headers: { "Content-Type": e.typeFull } }));
			return;
		}
		let p = (a.protocol === "https:" ? c : s).request, { signal: m } = i, h = null, g = () => {
			let e = new ge("The operation was aborted.");
			r(e), i.body && i.body instanceof u.Readable && i.body.destroy(e), !(!h || !h.body) && h.body.emit("error", e);
		};
		if (m && m.aborted) {
			g();
			return;
		}
		let _ = () => {
			g(), y();
		}, v = p(a.toString(), o);
		m && m.addEventListener("abort", _);
		let y = () => {
			v.abort(), m && m.removeEventListener("abort", _);
		};
		v.on("error", (e) => {
			r(new S(`request to ${i.url} failed, reason: ${e.message}`, "system", e)), y();
		}), ye(v, (e) => {
			h && h.body && h.body.destroy(e);
		}), process.version < "v14" && v.on("socket", (e) => {
			let t;
			e.prependListener("end", () => {
				t = e._eventsCount;
			}), e.prependListener("close", (n) => {
				if (h && t < e._eventsCount && !n) {
					let e = /* @__PURE__ */ Error("Premature close");
					e.code = "ERR_STREAM_PREMATURE_CLOSE", h.body.emit("error", e);
				}
			});
		}), v.on("response", (e) => {
			v.setTimeout(0);
			let a = ie(e.rawHeaders);
			if (U(e.statusCode)) {
				let o = a.get("Location"), s = null;
				try {
					s = o === null ? null : new URL(o, i.url);
				} catch {
					if (i.redirect !== "manual") {
						r(new S(`uri requested responds with an invalid redirect URL: ${o}`, "invalid-redirect")), y();
						return;
					}
				}
				switch (i.redirect) {
					case "error":
						r(new S(`uri requested responds with a redirect, redirect mode is set to error: ${i.url}`, "no-redirect")), y();
						return;
					case "manual": break;
					case "follow": {
						if (s === null) break;
						if (i.counter >= i.follow) {
							r(new S(`maximum redirect reached at: ${i.url}`, "max-redirect")), y();
							return;
						}
						let o = {
							headers: new B(i.headers),
							follow: i.follow,
							counter: i.counter + 1,
							agent: i.agent,
							compress: i.compress,
							method: i.method,
							body: P(i),
							signal: i.signal,
							size: i.size,
							referrer: i.referrer,
							referrerPolicy: i.referrerPolicy
						};
						if (!D(i.url, s) || !O(i.url, s)) for (let e of [
							"authorization",
							"www-authenticate",
							"cookie",
							"cookie2"
						]) o.headers.delete(e);
						if (e.statusCode !== 303 && i.body && t.body instanceof u.Readable) {
							r(new S("Cannot follow redirect with body being a readable stream", "unsupported-redirect")), y();
							return;
						}
						(e.statusCode === 303 || (e.statusCode === 301 || e.statusCode === 302) && i.method === "POST") && (o.method = "GET", o.body = void 0, o.headers.delete("content-length"));
						let c = ue(a);
						c && (o.referrerPolicy = c), n(ve(new $(s, o))), y();
						return;
					}
					default: return r(/* @__PURE__ */ TypeError(`Redirect option '${i.redirect}' is not a valid value of RequestRedirect`));
				}
			}
			m && e.once("end", () => {
				m.removeEventListener("abort", _);
			});
			let o = f(e, new d(), (e) => {
				e && r(e);
			});
			/* c8 ignore next 3 */
			process.version < "v12.10" && e.on("aborted", _);
			let s = {
				url: i.url,
				status: e.statusCode,
				statusText: e.statusMessage,
				headers: a,
				size: i.size,
				counter: i.counter,
				highWaterMark: i.highWaterMark
			}, c = a.get("Content-Encoding");
			if (!i.compress || i.method === "HEAD" || c === null || e.statusCode === 204 || e.statusCode === 304) {
				h = new K(o, s), n(h);
				return;
			}
			let p = {
				flush: l.Z_SYNC_FLUSH,
				finishFlush: l.Z_SYNC_FLUSH
			};
			if (c === "gzip" || c === "x-gzip") {
				o = f(o, l.createGunzip(p), (e) => {
					e && r(e);
				}), h = new K(o, s), n(h);
				return;
			}
			if (c === "deflate" || c === "x-deflate") {
				let t = f(e, new d(), (e) => {
					e && r(e);
				});
				t.once("data", (e) => {
					o = (e[0] & 15) == 8 ? f(o, l.createInflate(), (e) => {
						e && r(e);
					}) : f(o, l.createInflateRaw(), (e) => {
						e && r(e);
					}), h = new K(o, s), n(h);
				}), t.once("end", () => {
					h || (h = new K(o, s), n(h));
				});
				return;
			}
			if (c === "br") {
				o = f(o, l.createBrotliDecompress(), (e) => {
					e && r(e);
				}), h = new K(o, s), n(h);
				return;
			}
			h = new K(o, s), n(h);
		}), I(v, i).catch(r);
	});
}
function ye(e, t) {
	let n = p.from("0\r\n\r\n"), r = !1, i = !1, a;
	e.on("response", (e) => {
		let { headers: t } = e;
		r = t["transfer-encoding"] === "chunked" && !t["content-length"];
	}), e.on("socket", (o) => {
		let s = () => {
			if (r && !i) {
				let e = /* @__PURE__ */ Error("Premature close");
				e.code = "ERR_STREAM_PREMATURE_CLOSE", t(e);
			}
		}, c = (e) => {
			i = p.compare(e.slice(-5), n) === 0, !i && a && (i = p.compare(a.slice(-3), n.slice(0, 3)) === 0 && p.compare(e.slice(-2), n.slice(3)) === 0), a = e;
		};
		o.prependListener("close", s), o.on("data", c), e.on("close", () => {
			o.removeListener("close", s), o.removeListener("data", c);
		});
	});
}
var be;
//#endregion
e((() => {
	y(), L(), ae(), V(), he(), te(), _e(), W(), t(), k(), fe(), o(), be = new Set([
		"data:",
		"http:",
		"https:"
	]);
}))();
export { ve as default };
