"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
var react_router_1 = require("@tanstack/react-router");
var react_1 = require("react");
var client_1 = require("@/integrations/firebase/client");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var sonner_1 = require("sonner");
var Board_1 = require("@/components/Board");
var Dice_1 = require("@/components/Dice");
var PlayerCard_1 = require("@/components/PlayerCard");
var Avatar_1 = require("@/components/Avatar");
var constants_1 = require("@/game/constants");
var engine_1 = require("@/game/engine");
var ai_1 = require("@/game/ai");
var audio_1 = require("@/lib/audio");
var useGameAnimation_1 = require("@/hooks/useGameAnimation");
var Podium_1 = require("@/components/Podium");
exports.Route = (0, react_router_1.createFileRoute)("/play/online/$code")({
    head: function () { return ({ meta: [{ title: "Online Room — Ludo Star" }] }); },
    component: RoomPage,
});
function RoomPage() {
    var _this = this;
    var _a, _b, _c, _d, _e, _f;
    var code = exports.Route.useParams().code;
    var nav = (0, react_router_1.useNavigate)();
    var _g = (0, react_1.useState)(null), userId = _g[0], setUserId = _g[1];
    var _h = (0, react_1.useState)(null), room = _h[0], setRoom = _h[1];
    var _j = (0, react_1.useState)([]), players = _j[0], setPlayers = _j[1];
    var _k = (0, react_1.useState)({}), profiles = _k[0], setProfiles = _k[1];
    var _l = (0, react_1.useState)(new Set()), myFriends = _l[0], setMyFriends = _l[1];
    var _m = (0, react_1.useState)(false), rolling = _m[0], setRolling = _m[1];
    var _o = (0, react_1.useState)(false), copied = _o[0], setCopied = _o[1];
    var _p = (0, react_1.useState)(null), err = _p[0], setErr = _p[1];
    var writeLock = (0, react_1.useRef)(false);
    var hasResignedRef = (0, react_1.useRef)(false);
    var roomRefCurrent = (0, react_1.useRef)(null);
    var playersRefCurrent = (0, react_1.useRef)([]);
    (0, react_1.useEffect)(function () {
        roomRefCurrent.current = room;
        playersRefCurrent.current = players;
    }, [room, players]);
    (0, react_1.useEffect)(function () {
        var handleUnload = function () {
            var _a;
            var _b, _c, _d, _e, _f;
            var r = roomRefCurrent.current;
            var pl = playersRefCurrent.current;
            var uid = userId;
            if (!r || !uid)
                return;
            if (r.status === "quick_match_lobby" || r.status === "waiting") {
                if (hasResignedRef.current)
                    return;
                hasResignedRef.current = true;
                var newPlayers = pl.filter(function (p) { return p.user_id !== uid; });
                var updates = { players: newPlayers };
                if (r.isQuickMatch) {
                    updates.playerCount = newPlayers.length;
                    if ((_b = r.readyPlayers) === null || _b === void 0 ? void 0 : _b.includes(uid)) {
                        updates.readyPlayers = r.readyPlayers.filter(function (id) { return id !== uid; });
                    }
                }
                (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), updates).catch(function () { });
            }
            else if (r.status === "playing" && r.state) {
                var mySeat_1 = (_d = (_c = pl.find(function (p) { return p.user_id === uid; })) === null || _c === void 0 ? void 0 : _c.seat) !== null && _d !== void 0 ? _d : -1;
                var game_1 = r.state;
                if (mySeat_1 !== -1 && !((_e = game_1.resigned) === null || _e === void 0 ? void 0 : _e.includes(mySeat_1)) && !((_f = game_1.winners) === null || _f === void 0 ? void 0 : _f.includes(mySeat_1))) {
                    if (hasResignedRef.current)
                        return;
                    hasResignedRef.current = true;
                    var next = (0, engine_1.resignPlayer)(game_1, mySeat_1);
                    (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), (_a = {
                            state: next
                        },
                        _a["reactions.".concat(mySeat_1)] = { emoji: "🏳️", sender: mySeat_1, timestamp: Date.now() },
                        _a)).catch(function () { });
                    // Apply ban for leaving mid-game
                    (0, firestore_1.getDoc)((0, firestore_1.doc)(client_1.db, "profiles", uid)).then(function (pDoc) {
                        if (pDoc.exists()) {
                            var now = new Date();
                            var today = now.toISOString().split('T')[0];
                            var newBan = { until: Date.now() + 15 * 60 * 1000, count: 1, lastBanDay: today };
                            var oldBans = pDoc.data().bans;
                            if (oldBans && oldBans.lastBanDay === today) {
                                var newCount = oldBans.count + 1;
                                if (newCount >= 3) {
                                    var eod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
                                    newBan = { until: eod, count: newCount, lastBanDay: today };
                                }
                                else {
                                    newBan.count = newCount;
                                }
                            }
                            (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "profiles", uid), { bans: newBan }).catch(function () { });
                        }
                    }).catch(function () { });
                }
            }
        };
        window.addEventListener("pagehide", handleUnload);
        return function () {
            window.removeEventListener("pagehide", handleUnload);
            handleUnload();
        };
    }, [userId, code]);
    (0, react_1.useEffect)(function () {
        var unsubFriends = null;
        var unsubscribe = (0, auth_1.onAuthStateChanged)(client_1.auth, function (user) {
            if (!user) {
                nav({ to: "/auth" });
                return;
            }
            setUserId(user.uid);
            unsubFriends = (0, firestore_1.onSnapshot)((0, firestore_1.collection)(client_1.db, "profiles/".concat(user.uid, "/friends")), function (snap) {
                setMyFriends(new Set(snap.docs.map(function (d) { return d.id; })));
            });
        });
        return function () {
            unsubscribe();
            if (unsubFriends)
                unsubFriends();
        };
    }, [nav]);
    (0, react_1.useEffect)(function () {
        if (!userId)
            return;
        var roomRef = (0, firestore_1.doc)(client_1.db, "rooms", code);
        var unsub = (0, firestore_1.onSnapshot)(roomRef, function (docSnap) { return __awaiter(_this, void 0, void 0, function () {
            var r, pl, ids, q, profSnap, m_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!docSnap.exists()) {
                            setErr("Room not found");
                            return [2 /*return*/];
                        }
                        r = docSnap.data();
                        setRoom(r);
                        pl = r.players || [];
                        setPlayers(pl);
                        ids = pl.map(function (p) { return p.user_id; });
                        if (!ids.length) return [3 /*break*/, 2];
                        q = (0, firestore_1.query)((0, firestore_1.collection)(client_1.db, "profiles"), (0, firestore_1.where)("id", "in", ids));
                        return [4 /*yield*/, (0, firestore_1.getDocs)(q)];
                    case 1:
                        profSnap = _a.sent();
                        m_1 = {};
                        profSnap.forEach(function (d) {
                            m_1[d.id] = d.data();
                        });
                        setProfiles(m_1);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        return function () { return unsub(); };
    }, [userId, code]);
    (0, react_1.useEffect)(function () {
        var _a;
        // Auto-start quick match if all players are ready
        if ((room === null || room === void 0 ? void 0 : room.status) === "quick_match_lobby") {
            var readyCount = ((_a = room.readyPlayers) === null || _a === void 0 ? void 0 : _a.length) || 0;
            if (readyCount === players.length && players.length >= 2) {
                startGame();
            }
        }
    }, [room === null || room === void 0 ? void 0 : room.status, (_a = room === null || room === void 0 ? void 0 : room.readyPlayers) === null || _a === void 0 ? void 0 : _a.length, players.length]);
    var game = (room === null || room === void 0 ? void 0 : room.status) === "playing" || (room === null || room === void 0 ? void 0 : room.status) === "finished" ? room.state : null;
    var mySeat = (_c = (_b = players.find(function (p) { return p.user_id === userId; })) === null || _b === void 0 ? void 0 : _b.seat) !== null && _c !== void 0 ? _c : -1;
    var isHost = (room === null || room === void 0 ? void 0 : room.host_id) === userId;
    var isActuallyPlaying = (room === null || room === void 0 ? void 0 : room.status) === "playing" && game !== null && !(0, engine_1.gameOver)(game) && mySeat !== -1 && !((_d = game === null || game === void 0 ? void 0 : game.resigned) === null || _d === void 0 ? void 0 : _d.includes(mySeat));
    var navBlocker = (0, react_router_1.useBlocker)({
        shouldBlockFn: function () { return isActuallyPlaying; },
        withResolver: true,
    });
    function startGame() {
        return __awaiter(this, void 0, void 0, function () {
            var sortedPlayers, gamePlayers, init;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!room || (!isHost && !room.isQuickMatch) || players.length < 2)
                            return [2 /*return*/];
                        sortedPlayers = __spreadArray([], players, true).sort(function (a, b) { return a.seat - b.seat; });
                        gamePlayers = sortedPlayers.map(function (p) {
                            var _a, _b, _c, _d, _e;
                            return ({
                                seat: p.seat,
                                color: constants_1.COLORS[p.seat],
                                name: (_b = (_a = profiles[p.user_id]) === null || _a === void 0 ? void 0 : _a.display_name) !== null && _b !== void 0 ? _b : "Player",
                                avatarId: (_d = (_c = profiles[p.user_id]) === null || _c === void 0 ? void 0 : _c.avatar_id) !== null && _d !== void 0 ? _d : "a1",
                                country: (_e = profiles[p.user_id]) === null || _e === void 0 ? void 0 : _e.country,
                                kind: "remote",
                                userId: p.user_id,
                            });
                        });
                        init = (0, engine_1.createGame)(gamePlayers);
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), { status: "playing", state: init, matchCount: 1, scores: {} })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function nextMatch() {
        return __awaiter(this, void 0, void 0, function () {
            var init;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!room || !isHost || !game)
                            return [2 /*return*/];
                        init = (0, engine_1.createGame)(game.players);
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), {
                                status: "playing",
                                state: init,
                                matchCount: (room.matchCount || 1) + 1
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function leave() {
        return __awaiter(this, void 0, void 0, function () {
            var newPlayers, updates;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!room || !userId)
                            return [2 /*return*/];
                        newPlayers = players.filter(function (p) { return p.user_id !== userId; });
                        updates = { players: newPlayers };
                        if (room.isQuickMatch) {
                            updates.playerCount = newPlayers.length;
                            if ((_a = room.readyPlayers) === null || _a === void 0 ? void 0 : _a.includes(userId)) {
                                updates.readyPlayers = room.readyPlayers.filter(function (id) { return id !== userId; });
                            }
                        }
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), updates)];
                    case 1:
                        _b.sent();
                        nav({ to: "/play/online" });
                        return [2 /*return*/];
                }
            });
        });
    }
    function toggleReady() {
        return __awaiter(this, void 0, void 0, function () {
            var currentReady, newReady;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!room || !userId)
                            return [2 /*return*/];
                        currentReady = room.readyPlayers || [];
                        newReady = currentReady.includes(userId)
                            ? currentReady.filter(function (id) { return id !== userId; })
                            : __spreadArray(__spreadArray([], currentReady, true), [userId], false);
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), { readyPlayers: newReady })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function onResign() {
        return __awaiter(this, void 0, void 0, function () {
            var pdRef, pDoc, now, today, newBan, oldBans, newCount, eod, next;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!room || !userId || !game || mySeat < 0 || (0, engine_1.gameOver)(game))
                            return [2 /*return*/];
                        if (hasResignedRef.current)
                            return [2 /*return*/];
                        hasResignedRef.current = true;
                        pdRef = (0, firestore_1.doc)(client_1.db, "profiles", userId);
                        return [4 /*yield*/, (0, firestore_1.getDoc)(pdRef)];
                    case 1:
                        pDoc = _b.sent();
                        now = new Date();
                        today = now.toISOString().split('T')[0];
                        newBan = { until: Date.now() + 15 * 60 * 1000, count: 1, lastBanDay: today };
                        if (pDoc.exists()) {
                            oldBans = pDoc.data().bans;
                            if (oldBans && oldBans.lastBanDay === today) {
                                newCount = oldBans.count + 1;
                                if (newCount >= 3) {
                                    eod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
                                    newBan = { until: eod, count: newCount, lastBanDay: today };
                                }
                                else {
                                    newBan.count = newCount;
                                }
                            }
                        }
                        return [4 /*yield*/, (0, firestore_1.updateDoc)(pdRef, { bans: newBan })];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), (_a = {},
                                _a["reactions.".concat(mySeat)] = { emoji: "🏳️", sender: mySeat, timestamp: Date.now() },
                                _a))];
                    case 3:
                        _b.sent();
                        next = (0, engine_1.resignPlayer)(game, mySeat);
                        return [4 /*yield*/, handleStateChange(next)];
                    case 4:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function onKick(targetSeat) {
        return __awaiter(this, void 0, void 0, function () {
            var next;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!room || !isHost || !game || (0, engine_1.gameOver)(game))
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), (_a = {},
                                _a["reactions.".concat(targetSeat)] = { emoji: "👢", sender: targetSeat, timestamp: Date.now() },
                                _a))];
                    case 1:
                        _b.sent();
                        next = (0, engine_1.resignPlayer)(game, targetSeat);
                        return [4 /*yield*/, handleStateChange(next)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function pushState(newState, status, additionalRoomUpdates) {
        return __awaiter(this, void 0, void 0, function () {
            var upd_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!room || writeLock.current)
                            return [2 /*return*/];
                        writeLock.current = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        upd_1 = __assign({ state: newState }, additionalRoomUpdates);
                        if (status)
                            upd_1.status = status;
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), upd_1)];
                    case 2:
                        _a.sent();
                        setRoom(function (r) { return r ? __assign(__assign(__assign({}, r), upd_1), { state: newState, status: status !== null && status !== void 0 ? status : r.status }) : r; });
                        return [3 /*break*/, 4];
                    case 3:
                        writeLock.current = false;
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function handleStateChange(next) {
        return __awaiter(this, void 0, void 0, function () {
            var isGameOver, status, updates, board_1, reversedResigned, newScores, newCoinsEarned, numPlayers, getPoints, getCoins, _i, _a, _b, index, seat, p, points, earnedCoins, e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        isGameOver = (0, engine_1.gameOver)(next);
                        status = undefined;
                        updates = undefined;
                        if (!isGameOver) return [3 /*break*/, 7];
                        status = "finished";
                        board_1 = __spreadArray([], next.winners, true);
                        next.players.forEach(function (p, i) { if (!board_1.includes(i) && !p.hasResigned)
                            board_1.push(i); });
                        reversedResigned = __spreadArray([], (next.resigned || []), true).reverse();
                        reversedResigned.forEach(function (i) { if (!board_1.includes(i))
                            board_1.push(i); });
                        newScores = __assign({}, ((room === null || room === void 0 ? void 0 : room.scores) || {}));
                        newCoinsEarned = {};
                        numPlayers = next.players.length;
                        getPoints = function (num, rank) {
                            if (num === 2)
                                return rank === 0 ? 2 : 0;
                            if (num === 3)
                                return rank === 0 ? 3 : (rank === 1 ? 1 : 0);
                            if (num === 4)
                                return rank === 0 ? 5 : (rank === 1 ? 3 : (rank === 2 ? 1 : 0));
                            return 0;
                        };
                        getCoins = function (num, rank) {
                            if (num === 2)
                                return rank === 0 ? 100 : (rank === 1 ? 20 : 0);
                            if (num === 3)
                                return rank === 0 ? 100 : (rank === 1 ? 50 : (rank === 2 ? 20 : 0));
                            if (num === 4)
                                return rank === 0 ? 100 : (rank === 1 ? 50 : (rank === 2 ? 30 : (rank === 3 ? 10 : 0)));
                            return 0;
                        };
                        _i = 0, _a = board_1.entries();
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        _b = _a[_i], index = _b[0], seat = _b[1];
                        p = next.players[seat];
                        if (!(p && p.userId)) return [3 /*break*/, 5];
                        points = getPoints(numPlayers, index);
                        newScores[p.userId] = (newScores[p.userId] || 0) + points;
                        earnedCoins = getCoins(numPlayers, index);
                        newCoinsEarned[p.userId] = earnedCoins;
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "profiles", p.userId), {
                                "stats.coins": (0, firestore_1.increment)(earnedCoins)
                            })];
                    case 3:
                        _c.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _c.sent();
                        console.error("Failed to update coins for", p.userId, e_1);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        updates = { scores: newScores, coinsEarned: newCoinsEarned };
                        _c.label = 7;
                    case 7: return [4 /*yield*/, pushState(next, status, updates)];
                    case 8:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function doRoll() {
        return __awaiter(this, void 0, void 0, function () {
            var d, next, intermediate, waitTime;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!game || mySeat !== game.turn || rolling)
                            return [2 /*return*/];
                        setRolling(true);
                        d = (0, engine_1.rollDice)();
                        next = (0, engine_1.recordRoll)(game, d);
                        (0, audio_1.playRollSound)();
                        intermediate = __assign(__assign({}, game), { dice: d, awaitingMove: false, sixCount: game.sixCount });
                        return [4 /*yield*/, handleStateChange(intermediate)];
                    case 1:
                        _a.sent();
                        waitTime = next.dice === null ? 1000 : 600;
                        setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                            var moves, autoMoveIdx, positions_1, finalState;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        setRolling(false);
                                        if (!(next.dice === null)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, handleStateChange(next)];
                                    case 1:
                                        _a.sent();
                                        return [3 /*break*/, 6];
                                    case 2:
                                        moves = (0, engine_1.legalMoves)(next, d);
                                        autoMoveIdx = -1;
                                        if (moves.length === 1) {
                                            autoMoveIdx = moves[0];
                                        }
                                        else if (moves.length > 1) {
                                            positions_1 = moves.map(function (t) { return next.tokens[next.turn][t]; });
                                            if (positions_1.every(function (p) { return p === positions_1[0]; }))
                                                autoMoveIdx = moves[0];
                                        }
                                        if (!(autoMoveIdx >= 0)) return [3 /*break*/, 4];
                                        finalState = (0, engine_1.applyMove)(next, autoMoveIdx);
                                        return [4 /*yield*/, handleStateChange(finalState)];
                                    case 3:
                                        _a.sent();
                                        return [3 /*break*/, 6];
                                    case 4: return [4 /*yield*/, handleStateChange(next)];
                                    case 5:
                                        _a.sent();
                                        _a.label = 6;
                                    case 6: return [2 /*return*/];
                                }
                            });
                        }); }, waitTime);
                        return [2 /*return*/];
                }
            });
        });
    }
    function doMove(_seat, tokenIdx) {
        return __awaiter(this, void 0, void 0, function () {
            var next;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!game || mySeat !== game.turn)
                            return [2 /*return*/];
                        next = (0, engine_1.applyMove)(game, tokenIdx);
                        return [4 /*yield*/, handleStateChange(next)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    // Auto-play timer (Host only)
    (0, react_1.useEffect)(function () {
        if (!room || !isHost || room.status !== "playing" || !game)
            return;
        var isGameOver = (0, engine_1.gameOver)(game);
        if (isGameOver)
            return;
        var checkTimer = function () { return __awaiter(_this, void 0, void 0, function () {
            var elapsed, d, t, fallback;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (writeLock.current)
                            return [2 /*return*/];
                        elapsed = Date.now() - game.turnStartTime;
                        if (!(elapsed >= 60000)) return [3 /*break*/, 6];
                        if (!(!game.dice && !game.awaitingMove)) return [3 /*break*/, 2];
                        d = (0, engine_1.rollDice)();
                        return [4 /*yield*/, handleStateChange((0, engine_1.recordRoll)(game, d))];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 2:
                        if (!(game.awaitingMove && game.dice)) return [3 /*break*/, 6];
                        t = (0, ai_1.chooseMove)(game, game.dice);
                        if (!(t >= 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, handleStateChange((0, engine_1.applyMove)(game, t))];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        fallback = (0, engine_1.applyMove)(game, 0);
                        return [4 /*yield*/, handleStateChange(fallback).catch(function () { })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        var interval = setInterval(checkTimer, 1000);
        return function () { return clearInterval(interval); };
    }, [game, room, isHost]);
    function copyCode() {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code);
        }
        else {
            var textArea = document.createElement("textarea");
            textArea.value = code;
            textArea.style.position = "absolute";
            textArea.style.left = "-999999px";
            document.body.prepend(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
            }
            catch (error) {
                console.error("Copy failed", error);
            }
            finally {
                textArea.remove();
            }
        }
        setCopied(true);
        setTimeout(function () { return setCopied(false); }, 1500);
    }
    if (err)
        return <div className="min-h-screen p-6 text-center"><p className="mt-10 text-destructive">{err}</p><react_router_1.Link to="/play/online" className="btn-ghost mt-4 inline-flex">Back</react_router_1.Link></div>;
    if (!room)
        return <div className="min-h-screen p-6 text-center text-muted-foreground">Loading room…</div>;
    if (room.status === "lobby" || room.status === "quick_match_lobby") {
        return (<div className="min-h-screen p-6 flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none"/>
        <div className="mx-auto max-w-2xl w-full z-10">
          <button onClick={leave} className="btn-ghost mb-6 bg-background/50 backdrop-blur-md">← Leave Room</button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
              {room.isQuickMatch ? "اللعب السريع ⚡" : "Room Lobby"}
            </h1>
            <p className="text-muted-foreground">
              {room.isQuickMatch ? "بانتظار لاعبين آخرين..." : "Share this code with your friends to let them join!"}
            </p>
          </div>

          {!room.isQuickMatch && (<div className="panel mb-8 text-center bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
              <div className="text-sm uppercase tracking-widest text-primary mb-2 font-semibold">Your Room Code</div>
              <div className="my-4 text-6xl font-mono tracking-widest text-white drop-shadow-lg font-black">{code}</div>
              <button onClick={copyCode} className="btn-ghost !rounded-full px-6 transition-all hover:scale-105 hover:bg-white/10">
                {copied ? "✓ Copied to clipboard!" : "📋 Copy Code"}
              </button>
            </div>)}

          {!room.isQuickMatch && isHost && myFriends.size > 0 && (<div className="panel space-y-3 bg-card/40 backdrop-blur-md border border-white/5 mb-8">
              <h3 className="font-semibold text-lg flex items-center justify-between">
                <span>دعوة أصدقاء</span>
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from(myFriends).map(function (fid) {
                    var prof = profiles[fid];
                    if (!prof)
                        return null;
                    // Online if lastActive < 2 min ago
                    var isOnline = prof.isOnline && prof.lastActive && (Date.now() - prof.lastActive < 120000);
                    if (!isOnline)
                        return null;
                    return (<button key={fid} onClick={function () { return __awaiter(_this, void 0, void 0, function () {
                            var e_2;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(client_1.db, "profiles/".concat(fid, "/invites"), code), {
                                                id: code,
                                                roomCode: code,
                                                fromId: userId,
                                                fromName: ((_a = profiles[userId || '']) === null || _a === void 0 ? void 0 : _a.display_name) || "Player",
                                                timestamp: Date.now()
                                            })];
                                    case 1:
                                        _b.sent();
                                        sonner_1.toast.success("\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062F\u0639\u0648\u0629 \u0625\u0644\u0649 ".concat(prof.display_name));
                                        return [3 /*break*/, 3];
                                    case 2:
                                        e_2 = _b.sent();
                                        sonner_1.toast.error("حدث خطأ أثناء الإرسال");
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }} className="flex-shrink-0 flex items-center gap-2 bg-black/40 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-colors">
                      <Avatar_1.Avatar id={prof.avatar_id} size={24}/>
                      <span className="text-sm font-medium whitespace-nowrap">{prof.display_name}</span>
                      <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">دعوة</span>
                    </button>);
                })}
              </div>
            </div>)}

          <div className="panel space-y-3 bg-card/40 backdrop-blur-md border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Players</h3>
              <span className="text-sm px-3 py-1 bg-black/40 rounded-full font-mono text-primary border border-primary/20">{players.length} / 4</span>
            </div>
            <div className="grid gap-3">
              {[0, 1, 2, 3].map(function (seat) {
                var _a;
                var p = players.find(function (x) { return x.seat === seat; });
                var prof = p ? profiles[p.user_id] : undefined;
                var colorHex = ["#ef4444", "#22c55e", "#eab308", "#3b82f6"][seat];
                if (p && prof) {
                    var isReady = (_a = room.readyPlayers) === null || _a === void 0 ? void 0 : _a.includes(p.user_id);
                    return (<div key={seat} className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3 shadow-inner animate-in slide-in-from-right-4">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center shadow-lg border-2 border-black/50" style={{ backgroundColor: colorHex }}>
                        <Avatar_1.Avatar id={prof.avatar_id} size={36}/>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg leading-tight">{prof.display_name}</div>
                        {!room.isQuickMatch && p.user_id === room.host_id && <span className="text-[10px] uppercase tracking-wider text-primary font-bold">👑 Host</span>}
                        {room.isQuickMatch && (<span className={"text-xs font-bold ".concat(isReady ? 'text-green-400' : 'text-yellow-500')}>
                            {isReady ? "✅ جاهز" : "⏳ غير جاهز"}
                          </span>)}
                      </div>
                      {!room.isQuickMatch && (<div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse"/>)}
                    </div>);
                }
                else {
                    return (<div key={seat} className="flex items-center gap-4 rounded-xl border border-dashed border-white/10 bg-white/5 p-3 opacity-50">
                      <div className="h-10 w-10 rounded-full bg-black/20 border-2 border-dashed border-white/20"/>
                      <span className="flex-1 text-muted-foreground font-medium">Waiting for player...</span>
                    </div>);
                }
            })}
            </div>
          </div>
          <div className="mt-8">
            {room.isQuickMatch ? (<button onClick={toggleReady} className={"w-full text-xl py-4 shadow-xl transition-all font-bold rounded-xl border ".concat(((_e = room.readyPlayers) === null || _e === void 0 ? void 0 : _e.includes(userId || ''))
                    ? 'bg-destructive/80 hover:bg-destructive border-destructive text-white shadow-destructive/20'
                    : 'btn-game shadow-green-500/20 hover:shadow-green-500/40')}>
                {((_f = room.readyPlayers) === null || _f === void 0 ? void 0 : _f.includes(userId || '')) ? "إلغاء الجاهزية ❌" : "جاهز للعب ✅"}
              </button>) : isHost ? (<button onClick={startGame} disabled={players.length < 2} className="btn-game w-full text-xl py-4 shadow-xl shadow-primary/20 transition-all hover:shadow-primary/40 group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
                <span className="relative z-10">{players.length < 2 ? "Waiting for at least 1 more player..." : "Start Game (".concat(players.length, " Players)")}</span>
              </button>) : (<div className="p-4 rounded-xl border border-white/10 bg-black/40 text-center animate-pulse">
                <p className="text-muted-foreground font-medium">Waiting for the host to start the game...</p>
              </div>)}
          </div>
        </div>
      </div>);
    }
    if (!game)
        return <div className="p-6 text-center text-muted-foreground">Loading game…</div>;
    return <OnlineMatch game={game} room={room} mySeat={mySeat} profiles={profiles} userId={userId} doRoll={doRoll} doMove={doMove} rolling={rolling} leave={leave} onResign={onResign} onKick={onKick} isHost={isHost} nextMatch={nextMatch} code={code} myFriends={myFriends} navBlocker={navBlocker}/>;
}
function ChatAnimator(_a) {
    var chats = _a.chats, players = _a.players, profiles = _a.profiles;
    var _b = (0, react_1.useState)([]), activeChats = _b[0], setActiveChats = _b[1];
    (0, react_1.useEffect)(function () {
        if (!chats)
            return;
        var now = Date.now();
        var recent = Object.values(chats).filter(function (c) { return now - c.timestamp < 5000; });
        setActiveChats(recent);
        var timeout = setTimeout(function () {
            setActiveChats(function (prev) { return prev.filter(function (c) { return Date.now() - c.timestamp < 5000; }); });
        }, 5000);
        return function () { return clearTimeout(timeout); };
    }, [chats]);
    return (<>
      {activeChats.map(function (chat) { return (<AnimatedMessage key={chat.id} chat={chat} players={players}/>); })}
    </>);
}
function AnimatedMessage(_a) {
    var chat = _a.chat, players = _a.players;
    var _b = (0, react_1.useState)(null), pos = _b[0], setPos = _b[1];
    var _c = (0, react_1.useState)("start"), stage = _c[0], setStage = _c[1];
    (0, react_1.useEffect)(function () {
        var _a, _b;
        var senderColor = (_a = players.find(function (p) { return p.user_id === chat.senderId; })) === null || _a === void 0 ? void 0 : _a.color;
        var receiverColor = chat.receiverId ? (_b = players.find(function (p) { return p.user_id === chat.receiverId; })) === null || _b === void 0 ? void 0 : _b.color : undefined;
        var senderEl = document.getElementById(senderColor ? "base-".concat(senderColor) : "board-center");
        var receiverEl = receiverColor ? document.getElementById("base-".concat(receiverColor)) : document.getElementById("board-center");
        if (!senderEl || !receiverEl)
            return;
        var getCenter = function (el) {
            var rect = el.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        };
        var startPos = getCenter(senderEl);
        var endPos = getCenter(receiverEl);
        // Initial state
        setPos({ x: startPos.x, y: startPos.y, scale: 0.5, opacity: 0 });
        // Animate to start (pop up)
        var t1 = setTimeout(function () {
            setPos({ x: startPos.x, y: startPos.y, scale: 1.5, opacity: 1 });
            setStage("moving");
        }, 50);
        // Move to end
        var t2 = setTimeout(function () {
            setPos({ x: endPos.x, y: endPos.y, scale: 1.2, opacity: 1 });
        }, 800);
        // Fade out
        var t3 = setTimeout(function () {
            setPos(function (prev) { return prev ? __assign(__assign({}, prev), { opacity: 0, scale: 0.8 }) : null; });
            setStage("done");
        }, 3000);
        return function () { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [chat, players]);
    if (!pos || stage === "done")
        return null;
    return (<div style={{
            position: 'fixed',
            left: 0, top: 0,
            transform: "translate(".concat(pos.x, "px, ").concat(pos.y, "px) scale(").concat(pos.scale, ") translate(-50%, -50%)"),
            opacity: pos.opacity,
            transition: stage === 'start' ? 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'all 1.5s cubic-bezier(0.25, 1, 0.5, 1)',
            pointerEvents: 'none',
            zIndex: 9999,
        }} className="drop-shadow-2xl">
      {chat.type === "emoji" ? (<span className="text-6xl">{chat.content}</span>) : (<div className="bg-white text-black px-4 py-2 rounded-2xl rounded-tl-none font-bold text-xl border-4 border-primary shadow-xl whitespace-nowrap">
          {chat.content}
        </div>)}
    </div>);
}
function ChatMenu(_a) {
    var room = _a.room, userId = _a.userId, players = _a.players, profiles = _a.profiles, code = _a.code;
    var _b = (0, react_1.useState)(false), isOpen = _b[0], setIsOpen = _b[1];
    var _c = (0, react_1.useState)("phrases"), tab = _c[0], setTab = _c[1];
    var _d = (0, react_1.useState)(null), selectedContent = _d[0], setSelectedContent = _d[1];
    var PHRASES = [
        "أسرع من فضلك! ⏱️", "لعبة جيدة! 🤝", "يا إلهي! 😱", "حظاً موفقاً! 🍀", "واو! 🤯", "هل تمزح معي؟! 😠",
        "خصم ضعيف", "لعبة سيئة", "أنا ملك اللعبة", "أنا الأقوى", "سأسحقكم", "هذا دوري", "سأنسحب"
    ];
    var EMOJIS = ["😂", "😡", "😭", "🥳", "🤔", "😎", "💔", "🔥", "🧿", "♥", "🔨", "🔪", "☕", "🌶"];
    var opponents = players.filter(function (p) { return p.user_id !== userId; });
    function sendChat(receiverId) {
        return __awaiter(this, void 0, void 0, function () {
            var myProfile, myCoins, chatId, chat, _a, doc, updateDoc, increment, e_3;
            var _b;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!selectedContent || !userId)
                            return [2 /*return*/];
                        myProfile = profiles[userId];
                        myCoins = ((_c = myProfile === null || myProfile === void 0 ? void 0 : myProfile.stats) === null || _c === void 0 ? void 0 : _c.coins) || 0;
                        if (myCoins < 50) {
                            sonner_1.toast.error("ليس لديك عدد كافٍ من الكوينز (تحتاج 50 🪙)");
                            return [2 /*return*/];
                        }
                        chatId = Math.random().toString(36).substring(7);
                        chat = {
                            id: chatId,
                            type: selectedContent.type,
                            content: selectedContent.content,
                            senderId: userId,
                            receiverId: receiverId,
                            timestamp: Date.now()
                        };
                        return [4 /*yield*/, Promise.resolve().then(function () { return require("firebase/firestore"); })];
                    case 1:
                        _a = _d.sent(), doc = _a.doc, updateDoc = _a.updateDoc, increment = _a.increment;
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, updateDoc(doc(client_1.db, "profiles", userId), {
                                "stats.coins": increment(-50)
                            })];
                    case 3:
                        _d.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        e_3 = _d.sent();
                        console.error("Failed to deduct coins", e_3);
                        sonner_1.toast.error("حدث خطأ أثناء إرسال الرسالة");
                        return [2 /*return*/];
                    case 5: 
                    // Send chat
                    return [4 /*yield*/, updateDoc(doc(client_1.db, "rooms", code), (_b = {},
                            _b["chats.".concat(userId)] = chat,
                            _b))];
                    case 6:
                        // Send chat
                        _d.sent();
                        setIsOpen(false);
                        setSelectedContent(null);
                        return [2 /*return*/];
                }
            });
        });
    }
    return (<>
      <button onClick={function () { return setIsOpen(true); }} className="fixed bottom-6 right-6 w-16 h-16 bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] flex items-center justify-center text-3xl hover:scale-110 transition-transform z-40">
        💬
      </button>

      {isOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={function () { return setIsOpen(false); }}>
          <div className="bg-card/90 border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">الدردشة السريعة</h3>
              <button onClick={function () { return setIsOpen(false); }} className="text-muted-foreground hover:text-white">✕</button>
            </div>

            {!selectedContent ? (<>
                <div className="flex gap-2 mb-4 p-1 bg-black/40 rounded-xl">
                  <button className={"flex-1 py-2 rounded-lg font-bold ".concat(tab === 'phrases' ? 'bg-primary text-white' : 'text-muted-foreground')} onClick={function () { return setTab("phrases"); }}>جمل جاهزة</button>
                  <button className={"flex-1 py-2 rounded-lg font-bold ".concat(tab === 'emojis' ? 'bg-primary text-white' : 'text-muted-foreground')} onClick={function () { return setTab("emojis"); }}>ملصقات</button>
                </div>

                {tab === "phrases" ? (<div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
                    {PHRASES.map(function (p) { return (<button key={p} onClick={function () { return setSelectedContent({ type: "text", content: p }); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-right font-medium transition-colors">
                        {p}
                      </button>); })}
                  </div>) : (<div className="grid grid-cols-4 gap-3">
                    {EMOJIS.map(function (e) { return (<button key={e} onClick={function () { return setSelectedContent({ type: "emoji", content: e }); }} className="text-4xl p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-transform hover:scale-110">
                        {e}
                      </button>); })}
                  </div>)}
              </>) : (<div className="animate-in fade-in slide-in-from-right-4">
                <button onClick={function () { return setSelectedContent(null); }} className="text-sm text-primary mb-4 flex items-center gap-1">← العودة</button>
                <div className="text-center mb-6">
                  <p className="text-muted-foreground mb-2">إرسال إلى:</p>
                  <div className="text-3xl font-bold bg-black/40 py-4 rounded-xl border border-white/5">
                    {selectedContent.content}
                  </div>
                </div>

                <div className="grid gap-2">
                  <button onClick={function () { return sendChat(); }} className="p-4 bg-gradient-to-r from-primary to-accent rounded-xl font-bold text-lg hover:brightness-110 transition-all text-white shadow-lg">
                    الجميع 🌐
                  </button>
                  {opponents.map(function (p) {
                    var _a;
                    return (<button key={p.user_id} onClick={function () { return sendChat(p.user_id); }} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-medium flex items-center justify-between">
                      <span style={{ color: p.color }}>{((_a = profiles[p.user_id]) === null || _a === void 0 ? void 0 : _a.display_name) || "Player"}</span>
                      <span>رسالة خاصة 🎯</span>
                    </button>);
                })}
                </div>
              </div>)}
          </div>
        </div>)}
    </>);
}
function OnlineMatch(_a) {
    var _this = this;
    var _b;
    var game = _a.game, room = _a.room, mySeat = _a.mySeat, profiles = _a.profiles, userId = _a.userId, doRoll = _a.doRoll, doMove = _a.doMove, rolling = _a.rolling, leave = _a.leave, onResign = _a.onResign, onKick = _a.onKick, isHost = _a.isHost, nextMatch = _a.nextMatch, code = _a.code, myFriends = _a.myFriends, navBlocker = _a.navBlocker;
    var _c = (0, useGameAnimation_1.useGameAnimation)(game), animatedGame = _c.animatedGame, isAnimating = _c.isAnimating, killVfx = _c.killVfx;
    var displayGame = animatedGame || game;
    var currentPlayer = game.players[game.turn];
    var isGameOver = (0, engine_1.gameOver)(game);
    var finishedCount = function (seat) { return game.tokens[seat].filter(function (d) { return d === constants_1.FINISHED; }).length; };
    var myTurn = mySeat === game.turn;
    var canRoll = myTurn && !game.dice && !game.awaitingMove && !isAnimating && !isGameOver && !rolling;
    var _d = (0, react_1.useState)(false), showResignConfirm = _d[0], setShowResignConfirm = _d[1];
    (0, react_1.useEffect)(function () {
        if (!room || !userId || isGameOver)
            return;
        var measurePing = function () { return __awaiter(_this, void 0, void 0, function () {
            var currentPing, start, _a;
            var _b;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        currentPing = 50;
                        if (!('connection' in navigator && ((_c = navigator.connection) === null || _c === void 0 ? void 0 : _c.rtt))) return [3 /*break*/, 1];
                        currentPing = navigator.connection.rtt;
                        return [3 /*break*/, 5];
                    case 1:
                        start = Date.now();
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors', cache: 'no-store' })];
                    case 3:
                        _d.sent();
                        currentPing = Date.now() - start;
                        return [3 /*break*/, 5];
                    case 4:
                        _a = _d.sent();
                        currentPing = 500;
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), (_b = {},
                            _b["pings.".concat(userId)] = currentPing,
                            _b["lastActive.".concat(userId)] = Date.now(),
                            _b))];
                    case 6:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        measurePing();
        var interval = setInterval(measurePing, 10000);
        return function () { return clearInterval(interval); };
    }, [userId, code, isGameOver]);
    var players = (room === null || room === void 0 ? void 0 : room.players) || [];
    var lastActiveRef = (0, react_1.useRef)({});
    var lastSeenRef = (0, react_1.useRef)({});
    var _e = (0, react_1.useState)(new Set()), offlinePlayers = _e[0], setOfflinePlayers = _e[1];
    (0, react_1.useEffect)(function () {
        if (!(room === null || room === void 0 ? void 0 : room.lastActive))
            return;
        var now = Date.now();
        players.forEach(function (p) {
            var pLastActive = room.lastActive[p.user_id];
            if (pLastActive !== lastActiveRef.current[p.user_id]) {
                lastActiveRef.current[p.user_id] = pLastActive;
                lastSeenRef.current[p.user_id] = now;
            }
        });
    }, [room === null || room === void 0 ? void 0 : room.lastActive, players]);
    (0, react_1.useEffect)(function () {
        if (isGameOver)
            return;
        var interval = setInterval(function () {
            var now = Date.now();
            var currentOffline = new Set();
            players.forEach(function (p) {
                if (p.user_id === userId)
                    return;
                var lastSeen = lastSeenRef.current[p.user_id];
                // If haven't seen an update in 20 seconds, mark as disconnected
                if (lastSeen && now - lastSeen > 20000) {
                    currentOffline.add(p.user_id);
                }
            });
            setOfflinePlayers(function (prev) {
                currentOffline.forEach(function (id) {
                    var _a;
                    if (!prev.has(id)) {
                        sonner_1.toast.error("\uD83D\uDD0C ".concat(((_a = profiles[id]) === null || _a === void 0 ? void 0 : _a.display_name) || "Player", " disconnected"));
                    }
                });
                prev.forEach(function (id) {
                    var _a;
                    if (!currentOffline.has(id)) {
                        sonner_1.toast.success("\u26A1 ".concat(((_a = profiles[id]) === null || _a === void 0 ? void 0 : _a.display_name) || "Player", " reconnected"));
                    }
                });
                return currentOffline;
            });
        }, 5000);
        return function () { return clearInterval(interval); };
    }, [players, profiles, userId, isGameOver]);
    var prevDice = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (game.dice !== null && prevDice.current === null && !myTurn) {
            (0, audio_1.playRollSound)();
        }
        prevDice.current = game.dice;
    }, [game.dice, myTurn]);
    var _f = (0, react_1.useState)(60), timeLeft = _f[0], setTimeLeft = _f[1];
    (0, react_1.useEffect)(function () {
        if (isGameOver)
            return;
        var interval = setInterval(function () {
            var elapsed = Math.floor((Date.now() - game.turnStartTime) / 1000);
            setTimeLeft(Math.max(0, 60 - elapsed));
        }, 500);
        return function () { return clearInterval(interval); };
    }, [game.turnStartTime, isGameOver]);
    var originalMatchRanks = (0, react_1.useMemo)(function () {
        var board = __spreadArray([], game.winners, true);
        game.players.forEach(function (p, i) { if (!board.includes(i) && !p.hasResigned)
            board.push(i); });
        var reversedResigned = __spreadArray([], (game.resigned || []), true).reverse();
        reversedResigned.forEach(function (i) { if (!board.includes(i))
            board.push(i); });
        return board;
    }, [game.winners, game.players, game.resigned]);
    var leaderboard = (0, react_1.useMemo)(function () {
        if (!isGameOver)
            return [];
        if ((room.matchCount || 1) >= 5) {
            return __spreadArray([], originalMatchRanks, true).sort(function (a, b) {
                var _a, _b;
                var pA = game.players[a].userId;
                var pB = game.players[b].userId;
                return (((_a = room.scores) === null || _a === void 0 ? void 0 : _a[pB]) || 0) - (((_b = room.scores) === null || _b === void 0 ? void 0 : _b[pA]) || 0);
            });
        }
        return originalMatchRanks;
    }, [isGameOver, room.matchCount, room.scores, originalMatchRanks, game.players]);
    var _g = (0, react_1.useState)(false), statsUpdated = _g[0], setStatsUpdated = _g[1];
    (0, react_1.useEffect)(function () {
        if ((room === null || room === void 0 ? void 0 : room.status) !== "finished" || !game || !userId) {
            setStatsUpdated(false);
            return;
        }
        var matchId = "".concat(code, "_").concat((room === null || room === void 0 ? void 0 : room.matchCount) || 1);
        if (statsUpdated || localStorage.getItem("stats_".concat(matchId)))
            return;
        var updateMyStats = function () { return __awaiter(_this, void 0, void 0, function () {
            var myPlayer, board, reversedResigned, myRank, points, isWin, profileRef, snap, currentStats, currentWinStreak, maxWinStreak, piecesEatenInMatch, deathsInMatch, flawlessWins, _a, piecesEatenInMatch, deathsInMatch, flawlessWins;
            var _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        setStatsUpdated(true);
                        localStorage.setItem("stats_".concat(matchId), "1");
                        myPlayer = game.players.find(function (p) { return p.userId === userId; });
                        if (!myPlayer)
                            return [2 /*return*/];
                        board = __spreadArray([], game.winners, true);
                        game.players.forEach(function (p, i) { if (!board.includes(i) && !p.hasResigned)
                            board.push(i); });
                        reversedResigned = __spreadArray([], (game.resigned || []), true).reverse();
                        reversedResigned.forEach(function (i) { if (!board.includes(i))
                            board.push(i); });
                        myRank = board.indexOf(myPlayer.seat);
                        points = Math.max(0, game.players.length - myRank);
                        isWin = myRank === 0;
                        profileRef = (0, firestore_1.doc)(client_1.db, "profiles", userId);
                        _l.label = 1;
                    case 1:
                        _l.trys.push([1, 4, , 6]);
                        return [4 /*yield*/, (0, firestore_1.getDoc)(profileRef)];
                    case 2:
                        snap = _l.sent();
                        currentStats = ((_b = snap.data()) === null || _b === void 0 ? void 0 : _b.stats) || {};
                        currentWinStreak = currentStats.currentWinStreak || 0;
                        maxWinStreak = currentStats.maxWinStreak || 0;
                        if (isWin) {
                            currentWinStreak++;
                            if (currentWinStreak > maxWinStreak)
                                maxWinStreak = currentWinStreak;
                        }
                        else {
                            currentWinStreak = 0;
                        }
                        piecesEatenInMatch = ((_d = (_c = game.stats) === null || _c === void 0 ? void 0 : _c.kills) === null || _d === void 0 ? void 0 : _d[myPlayer.seat]) || 0;
                        deathsInMatch = ((_f = (_e = game.stats) === null || _e === void 0 ? void 0 : _e.deaths) === null || _f === void 0 ? void 0 : _f[myPlayer.seat]) || 0;
                        flawlessWins = currentStats.flawlessWins || 0;
                        if (isWin && deathsInMatch === 0) {
                            flawlessWins++;
                        }
                        return [4 /*yield*/, (0, firestore_1.updateDoc)(profileRef, {
                                "stats.gamesPlayed": (0, firestore_1.increment)(1),
                                "stats.totalPoints": (0, firestore_1.increment)(points),
                                "stats.wins": (0, firestore_1.increment)(isWin ? 1 : 0),
                                "stats.piecesEaten": (0, firestore_1.increment)(piecesEatenInMatch),
                                "stats.currentWinStreak": currentWinStreak,
                                "stats.maxWinStreak": maxWinStreak,
                                "stats.flawlessWins": flawlessWins
                            })];
                    case 3:
                        _l.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        _a = _l.sent();
                        piecesEatenInMatch = ((_h = (_g = game.stats) === null || _g === void 0 ? void 0 : _g.kills) === null || _h === void 0 ? void 0 : _h[myPlayer.seat]) || 0;
                        deathsInMatch = ((_k = (_j = game.stats) === null || _j === void 0 ? void 0 : _j.deaths) === null || _k === void 0 ? void 0 : _k[myPlayer.seat]) || 0;
                        flawlessWins = (isWin && deathsInMatch === 0) ? 1 : 0;
                        return [4 /*yield*/, (0, firestore_1.setDoc)(profileRef, {
                                stats: {
                                    gamesPlayed: 1,
                                    totalPoints: points,
                                    wins: isWin ? 1 : 0,
                                    piecesEaten: piecesEatenInMatch,
                                    currentWinStreak: isWin ? 1 : 0,
                                    maxWinStreak: isWin ? 1 : 0,
                                    flawlessWins: flawlessWins
                                }
                            }, { merge: true })];
                    case 5:
                        _l.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        updateMyStats();
    }, [room === null || room === void 0 ? void 0 : room.status, game, userId, statsUpdated, code, room === null || room === void 0 ? void 0 : room.matchCount]);
    var _h = (0, react_1.useState)(null), reactionTarget = _h[0], setReactionTarget = _h[1];
    function sendReaction(targetSeat, emoji) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (mySeat < 0)
                            return [2 /*return*/];
                        setReactionTarget(null);
                        return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(client_1.db, "rooms", code), (_a = {},
                                _a["reactions.".concat(targetSeat)] = { emoji: emoji, sender: mySeat, timestamp: Date.now() },
                                _a))];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    return (<div className={"min-h-screen p-3 md:p-6 relative overflow-hidden ".concat((killVfx === null || killVfx === void 0 ? void 0 : killVfx.active) ? 'animate-shake' : '')}>
      <ChatAnimator chats={room.chats} players={room.players || []} profiles={profiles}/>
      <ChatMenu room={room} userId={userId} players={room.players || []} profiles={profiles} code={code}/>
      {isGameOver && <Podium_1.Podium game={game} onHome={leave} room={room}/>}
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={leave} className="btn-ghost">← Leave</button>
          <span className="text-sm text-muted-foreground font-medium">Match {room.matchCount || 1} of 5 &nbsp;·&nbsp; Room <span className="font-mono">{code}</span></span>
          <react_router_1.Link to="/" className="btn-ghost">Home</react_router_1.Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="panel">
            <Board_1.Board state={displayGame} onTokenClick={myTurn && !isAnimating ? doMove : undefined} killVfx={killVfx}/>
          </div>
          <div className="space-y-3">
            <div className="panel">
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>{myTurn ? "Your turn" : "".concat(currentPlayer.name, "'s turn")}</span>
                {!isGameOver && (<span className={"font-bold transition-colors ".concat(timeLeft <= 10 ? 'text-destructive animate-pulse' : '')}>
                    {timeLeft <= 10 ? '⏰' : '⏱'} {timeLeft}s
                  </span>)}
              </div>
              <div className="flex items-center gap-3">
                <Avatar_1.Avatar id={currentPlayer.avatarId} size={56} ring={"var(--ludo-".concat(currentPlayer.color, ")")}/>
                <div className="flex-1">
                  <div className="font-bold">{currentPlayer.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{currentPlayer.color}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Dice_1.Dice value={displayGame.dice} rolling={false} size={72}/>
                <button onClick={doRoll} disabled={!canRoll} className="btn-game">
                  {rolling ? "..." : myTurn ? (game.awaitingMove ? "Choose token" : "Roll dice") : "Waiting…"}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {displayGame.players.map(function (p, i) {
            var _a, _b, _c, _d, _e;
            if (p.hasResigned)
                return null;
            var prof = profiles === null || profiles === void 0 ? void 0 : profiles[p.userId];
            var ping = (_a = room.pings) === null || _a === void 0 ? void 0 : _a[p.userId];
            var isStale = offlinePlayers.has(p.userId);
            return (<div key={i} className="relative">
                    <div onClick={function () { if (p.userId !== userId)
                setReactionTarget(i); }} className={p.userId !== userId ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""}>
                      <PlayerCard_1.PlayerCard player={p} active={i === displayGame.turn && !isGameOver} finishedCount={finishedCount(i)} ping={ping} isStale={isStale}/>
                    </div>
                    {p.userId === userId && !isHost && !isGameOver && (<button onClick={function () { return setShowResignConfirm(true); }} className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-destructive/10 text-destructive text-xs font-bold rounded hover:bg-destructive/20 border border-destructive/30" title="انسحاب">
                        🏳️ انسحاب
                      </button>)}
                    {isHost && p.userId !== userId && !isGameOver && displayGame.players.length > 2 && displayGame.players.filter(function (rp) { return !rp.hasResigned; }).length > 2 && (<button onClick={function (e) { e.stopPropagation(); onKick(i); }} className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-destructive/10 text-destructive text-xs font-bold rounded hover:bg-destructive/20 border border-destructive/30" title="طرد اللاعب">
                        👢 طرد
                      </button>)}
                    {reactionTarget === i && (<div className="absolute top-full right-0 z-50 mt-2 w-64 p-4 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
                          <Avatar_1.Avatar id={p.avatarId} size={48}/>
                          <div>
                            <div className="font-bold">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{(prof === null || prof === void 0 ? void 0 : prof.country) || 'Unknown'}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-xl font-bold text-primary">{((_b = prof === null || prof === void 0 ? void 0 : prof.stats) === null || _b === void 0 ? void 0 : _b.totalPoints) || 0}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-xl font-bold text-accent">{((_c = prof === null || prof === void 0 ? void 0 : prof.stats) === null || _c === void 0 ? void 0 : _c.wins) || 0}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Wins</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2 col-span-2">
                            <div className="text-sm font-bold text-white">{((_d = prof === null || prof === void 0 ? void 0 : prof.stats) === null || _d === void 0 ? void 0 : _d.gamesPlayed) ? Math.round((prof.stats.wins / prof.stats.gamesPlayed) * 100) : 0}%</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate ({((_e = prof === null || prof === void 0 ? void 0 : prof.stats) === null || _e === void 0 ? void 0 : _e.gamesPlayed) || 0} matches)</div>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider text-center">Send Reaction</div>
                        <div className="flex justify-center gap-2">
                          {["😂", "😡", "😢", "👋", "GG!"].map(function (emoji) { return (<button key={emoji} onClick={function () { return sendReaction(i, emoji); }} className="text-xl hover:scale-125 transition-transform bg-white/5 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                              {emoji}
                            </button>); })}
                        </div>
                        <button onClick={function (e) { e.stopPropagation(); setReactionTarget(null); }} className="absolute top-2 right-2 text-muted-foreground hover:text-white w-6 h-6 flex items-center justify-center rounded-full bg-white/10">✕</button>
                      </div>)}
                  </div>);
        })}
            </div>
          </div>
        </div>
        {isGameOver && !isAnimating && (<div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 animate-in fade-in zoom-in backdrop-blur-sm">
            <div className="panel max-w-md w-full text-center shadow-2xl border border-white/10">
              <div className="mb-4 text-6xl drop-shadow-lg">🏆</div>
              <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {(room.matchCount || 1) >= 5 ? "Series Champion!" : "Match ".concat((room.matchCount || 1), " Finished!")}
              </h2>
              <p className="mb-6 text-muted-foreground">
                {(room.matchCount || 1) >= 5 ? "Final Series Standings" : "Match Standings"}
              </p>
              <div className="space-y-3 mb-8">
                {leaderboard.map(function (seat, index) {
                var _a, _b;
                var p = game.players[seat];
                var matchRank = originalMatchRanks.indexOf(seat);
                var matchPts = Math.max(0, game.players.length - matchRank);
                var totalPts = ((_a = room.scores) === null || _a === void 0 ? void 0 : _a[p.userId]) || 0;
                var rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600", "text-muted-foreground"];
                var medals = ["🥇", "🥈", "🥉", ""];
                return (<div key={seat} className={"flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-black/20 ".concat(index === 0 ? "bg-primary/10 border-primary/30" : "")}>
                      <div className={"text-2xl font-black w-8 ".concat(rankColors[index])}>{medals[index] || "#".concat(index + 1)}</div>
                      <Avatar_1.Avatar id={p.avatarId} size={40}/>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-lg leading-tight">{p.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          +{matchPts} pts (Total: {totalPts})
                          {((_b = room.coinsEarned) === null || _b === void 0 ? void 0 : _b[p.userId]) ? (<span className="ml-1 text-yellow-400 font-bold flex items-center gap-1">
                              • +{room.coinsEarned[p.userId]} <img src="/coin.png" alt="coins" className="w-3 h-3 inline"/>
                            </span>) : null}
                        </div>
                      </div>

                      {userId !== p.userId && !myFriends.has(p.userId || '') && (<button onClick={function () { return __awaiter(_this, void 0, void 0, function () {
                            var e_4;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!userId || !p.userId)
                                            return [2 /*return*/];
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 4, , 5]);
                                        return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(client_1.db, "profiles/".concat(userId, "/friends"), p.userId), { id: p.userId, addedAt: Date.now() })];
                                    case 2:
                                        _a.sent();
                                        return [4 /*yield*/, (0, firestore_1.setDoc)((0, firestore_1.doc)(client_1.db, "profiles/".concat(p.userId, "/friends"), userId), { id: userId, addedAt: Date.now() })];
                                    case 3:
                                        _a.sent();
                                        sonner_1.toast.success("\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 ".concat(p.name, " \u0625\u0644\u0649 \u0623\u0635\u062F\u0642\u0627\u0626\u0643!"));
                                        return [3 /*break*/, 5];
                                    case 4:
                                        e_4 = _a.sent();
                                        sonner_1.toast.error("حدث خطأ أثناء إضافة الصديق.");
                                        return [3 /*break*/, 5];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        }); }} className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/40 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-bold transition-colors whitespace-nowrap mr-2">
                          ➕ إضافة صديق
                        </button>)}

                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "var(--ludo-".concat(p.color, ")") }}/>
                    </div>);
            })}
              </div>
              <div className="flex gap-3">
                {room.host_id === ((_b = client_1.auth.currentUser) === null || _b === void 0 ? void 0 : _b.uid) && (room.matchCount || 1) < 5 ? (<button onClick={nextMatch} className="btn-game flex-1 py-4">Start Next Match</button>) : null}
                <button onClick={leave} className="btn-ghost flex-1 py-4">Leave Room</button>
              </div>
            </div>
          </div>)}

        {(showResignConfirm || (navBlocker === null || navBlocker === void 0 ? void 0 : navBlocker.status) === "blocked") && (<div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 animate-in fade-in backdrop-blur-sm">
            <div className="panel max-w-sm w-full text-center shadow-2xl border border-destructive/50 bg-black/95">
              <div className="mb-4 text-5xl">⚠️</div>
              <h2 className="text-xl font-bold mb-2">هل أنت متأكد من الانسحاب؟</h2>
              <p className="mb-6 text-sm text-destructive font-bold bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                ملاحظة: سيتم حظرك من اللعب أونلاين لمدة 15 دقيقة كعقوبة.
              </p>
              <div className="flex gap-3">
                <button onClick={function () {
                setShowResignConfirm(false);
                if ((navBlocker === null || navBlocker === void 0 ? void 0 : navBlocker.status) === "blocked")
                    navBlocker.reset();
            }} className="btn-ghost flex-1 py-3 text-sm">إلغاء</button>
                <button onClick={function () {
                setShowResignConfirm(false);
                onResign().then(function () {
                    if ((navBlocker === null || navBlocker === void 0 ? void 0 : navBlocker.status) === "blocked")
                        navBlocker.proceed();
                });
            }} className="btn-game bg-destructive/80 hover:bg-destructive flex-1 py-3 text-sm">نعم، انسحب</button>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
}
