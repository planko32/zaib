// DemoWallet - frontend-only wallet and state engine
// This is a demo client-side engine to simulate balances, income,
// swaps, withdrawals, team summary, and invite info. All data is
// stored in localStorage and is NOT real money.

(function (global) {
  var STORAGE_KEY = "demoWalletState_v1";
  var USER_KEY = "demoCurrentUser";

  function nowIso() {
    return new Date().toISOString();
  }

  function readCurrentUser() {
    var u = null;
    try {
      var raw = localStorage.getItem(USER_KEY);
      if (raw) u = JSON.parse(raw);
    } catch (e) {
      u = null;
    }
    if (!u || typeof u !== "object") {
      u = {};
    }
    if (!u.id) {
      // generate a simple ID
      var base = Date.now().toString().slice(-6);
      var rand = Math.floor(Math.random() * 900) + 100;
      u.id = "U" + base + String(rand);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      } catch (e) {}
    }
    if (!u.inviteOwnCode) {
      // own invite code for this user
      var codeBase = (u.id || "U000000") + (u.phoneDigits || "");
      u.inviteOwnCode = (codeBase || "INV").replace(/[^0-9A-Za-z]/g, "").slice(-8) || ("INV" + Date.now().toString().slice(-4));
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      } catch (e) {}
    }
    return u;
  }

  function initialState() {
    var user = readCurrentUser();
    var createdAt = nowIso();
    var balances = {
      USDT: 3,   // signup bonus
      BTC: 0,
      ETH: 0,
      USDC: 0,
      TRX: 0
    };
    return {
      userId: user.id || null,
      createdAt: createdAt,
      balances: balances,
      personal: {
        today: 0,
        total: 0
      },
      team: {
        today: 0,
        total: 0
      },
      totalIncome: 0,
      lastIncomeAt: null,
      lastWithdrawAt: null,
      transactions: [
        {
          id: "tx_bonus_" + createdAt,
          type: "income",
          amount: 3,
          currency: "USDT",
          status: "SUCCESS",
          fee: 0,
          net: 3,
          createdAt: createdAt,
          note: "Signup bonus"
        }
      ],
      invite: {
        code: user.inviteOwnCode || "",
        inviterCode: user.inviterCode || user.invitationCode || "",
        link: "" // will be filled dynamically
      },
      teamSummary: null
    };
  }

  function loadState() {
    var st = null;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) st = JSON.parse(raw);
    } catch (e) {
      st = null;
    }
    if (!st || typeof st !== "object" || !st.balances) {
      st = initialState();
      saveState(st);
    }
    // ensure fields exist
    st.personal = st.personal || { today: 0, total: 0 };
    st.team = st.team || { today: 0, total: 0 };
    st.balances = st.balances || { USDT: 0, BTC: 0, ETH: 0, USDC: 0, TRX: 0 };
    st.transactions = Array.isArray(st.transactions) ? st.transactions : [];
    if (typeof st.totalIncome !== "number") {
      st.totalIncome = st.personal.total || 0;
    }
    return st;
  }

  function saveState(st) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e) {}
  }

  function computeTotalUSDT(st) {
    // For demo we just sum numeric balances directly
    var sum = 0;
    Object.keys(st.balances).forEach(function (k) {
      var v = st.balances[k];
      if (typeof v === "number" && !isNaN(v)) sum += v;
    });
    return sum;
  }

  function recordTx(st, tx) {
    tx = tx || {};
    tx.id = tx.id || ("tx_" + Date.now() + "_" + Math.floor(Math.random() * 100000));
    tx.createdAt = tx.createdAt || nowIso();
    st.transactions.unshift(tx);
  }

  var DemoWallet = {
    getUser: function () {
      return readCurrentUser();
    },
    setUser: function (user) {
      if (!user || typeof user !== "object") return;
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch (e) {}
    },
    getState: function () {
      return loadState();
    },
    saveState: function (st) {
      saveState(st);
    },
    getWallet: function () {
      var st = loadState();
      var balance = typeof st.balances.USDT === "number" ? st.balances.USDT : 0;
      var totalUSDT = computeTotalUSDT(st);
      var todayIncome = st.personal.today || 0;
      var totalIncome = st.personal.total || 0;
      var todayTeamIncome = st.team.today || 0;
      var totalTeamIncome = st.team.total || 0;
      return {
        balance: balance,
        balances: st.balances,
        totalUSDT: totalUSDT,
        todayIncome: todayIncome,
        totalIncome: totalIncome,
        todayTeamIncome: todayTeamIncome,
        totalTeamIncome: totalTeamIncome
      };
    },
    addIncome: function (amount) {
      var v = parseFloat(amount);
      if (!(v > 0)) return;
      var st = loadState();
      if (typeof st.balances.USDT !== "number") st.balances.USDT = 0;
      st.balances.USDT += v;
      st.personal.today += v;
      st.personal.total += v;
      st.totalIncome = st.personal.total;
      st.lastIncomeAt = nowIso();
      recordTx(st, {
        type: "income",
        amount: v,
        currency: "USDT",
        status: "SUCCESS",
        fee: 0,
        net: v,
        note: "AI power income"
      });
      saveState(st);
    },
    withdraw: function (amount) {
      var v = parseFloat(amount);
      if (!(v > 0)) return null;
      var st = loadState();
      var cur = typeof st.balances.USDT === "number" ? st.balances.USDT : 0;
      if (cur < v) {
        return null;
      }
      var fee = v * 0.05;
      var net = v - fee;
      st.balances.USDT = cur - v;
      st.lastWithdrawAt = nowIso();
      recordTx(st, {
        type: "withdraw",
        amount: v,
        currency: "USDT",
        status: "PENDING",
        fee: fee,
        net: net,
        note: "Withdrawal request (demo)"
      });
      saveState(st);
      return {
        balance: st.balances.USDT
      };
    },
    recordSwap: function (fromToken, toToken, amount, received) {
      var v = parseFloat(amount);
      var r = parseFloat(received);
      if (!(v > 0)) return;
      var st = loadState();
      st.balances[fromToken] = st.balances[fromToken] || 0;
      st.balances[toToken] = st.balances[toToken] || 0;
      if (st.balances[fromToken] < v) return;
      st.balances[fromToken] -= v;
      st.balances[toToken] += (r > 0 ? r : v);
      recordTx(st, {
        type: "swap",
        amount: v,
        currency: String(fromToken + "→" + toToken),
        status: "SUCCESS",
        fee: 0,
        net: r > 0 ? r : v,
        note: "Swap (demo)"
      });
      saveState(st);
    },
    getTransactions: function () {
      var st = loadState();
      return st.transactions.slice();
    },
    getVipInfo: function () {
      var st = loadState();
      var bal = typeof st.balances.USDT === "number" ? st.balances.USDT : 0;
      var currentLevel = "V0";
      if (bal >= 3000) currentLevel = "V3";
      else if (bal >= 500) currentLevel = "V2";
      else if (bal >= 50) currentLevel = "V1";

      var nextLevel = null;
      var progressText = "";
      var progressPercent = 0;

      if (currentLevel === "V0") {
        nextLevel = "V1";
        var need = Math.max(50 - bal, 0);
        progressText = "Recharge " + need.toFixed(2) + " USDT to reach V1";
        progressPercent = Math.min((bal / 50) * 100, 100);
      } else if (currentLevel === "V1") {
        nextLevel = "V2";
        var need2 = Math.max(500 - bal, 0);
        progressText = "Recharge " + need2.toFixed(2) + " USDT to reach V2";
        progressPercent = Math.min((bal / 500) * 100, 100);
      } else if (currentLevel === "V2") {
        nextLevel = "V3";
        var need3 = Math.max(3000 - bal, 0);
        progressText = "Recharge " + need3.toFixed(2) + " USDT to reach V3";
        progressPercent = Math.min((bal / 3000) * 100, 100);
      } else if (currentLevel === "V3") {
        nextLevel = null;
        progressText = "You have reached the highest VIP level.";
        progressPercent = 100;
      }

      return {
        currentLevel: currentLevel,
        nextLevel: nextLevel,
        progressText: progressText,
        progressPercent: progressPercent
      };
    },
    getInviteInfo: function () {
      var user = readCurrentUser();
      var st = loadState();
      var code = st.invite && st.invite.code ? st.invite.code : (user.inviteOwnCode || "");
      var baseUrl = (location && location.origin) ? location.origin : "";
      var link = baseUrl ? (baseUrl + "/signup.html?code=" + encodeURIComponent(code || "")) : "";
      return {
        code: code,
        link: link
      };
    },
    getTeamSummary: function () {
      // Demo-only stub data; real implementation should pull from backend
      var summary = {
        teamSize: 0,
        todayIncome: 0,
        totalIncome: 0,
        generations: {
          1: { effective: 0, percent: 20, income: 0 },
          2: { effective: 0, percent: 5, income: 0 },
          3: { effective: 0, percent: 3, income: 0 }
        },
        members: []
      };
      return summary;
    },
    applyToAssetsPage: function () {
      var w = this.getWallet();

      try {
        // Total assets donut
        var donutInner = document.querySelector(".donut-inner");
        if (donutInner) {
          var html = "<strong>Total Assets</strong><br/>≈$" +
            (w.totalUSDT || 0).toFixed(2);
          donutInner.innerHTML = html;
        }

        // Income summary
        var elTotalPersonal = document.querySelector(".assets-total-personal");
        var elTotalTeam = document.querySelector(".assets-total-team");
        var elTodayPersonal = document.querySelector(".assets-today-personal");
        var elTodayTeam = document.querySelector(".assets-today-team");

        if (elTotalPersonal) {
          elTotalPersonal.textContent = (w.totalIncome || 0).toFixed(2) + " USDT";
        }
        if (elTotalTeam) {
          elTotalTeam.textContent = (w.totalTeamIncome || 0).toFixed(2) + " USDT";
        }
        if (elTodayPersonal) {
          elTodayPersonal.textContent = (w.todayIncome || 0).toFixed(2) + " USDT";
        }
        if (elTodayTeam) {
          elTodayTeam.textContent = (w.todayTeamIncome || 0).toFixed(2) + " USDT";
        }

        // Currency list amounts
        var rows = document.querySelectorAll(".currency-row");
        rows.forEach(function (row) {
          var nameEl = row.querySelector(".currency-name");
          var amtEl = row.querySelector(".currency-amount");
          if (!nameEl || !amtEl) return;
          var symbol = (nameEl.textContent || "").trim().toUpperCase();
          var val = w.balances[symbol];
          if (typeof val !== "number" || isNaN(val)) val = 0;
          amtEl.textContent = val.toFixed(2);
        });

        // Token percentages
        var total = w.totalUSDT || 0;
        var tokenRows = document.querySelectorAll(".token-row");
        tokenRows.forEach(function (row) {
          var nameEl = row.querySelector(".token-name");
          var pctEl = row.querySelector(".token-percent");
          if (!nameEl || !pctEl) return;
          var symbol = (nameEl.textContent || "").trim().toUpperCase();
          var val = w.balances[symbol];
          if (typeof val !== "number" || isNaN(val) || total <= 0) {
            pctEl.textContent = "0.00%";
          } else {
            var pct = (val / total) * 100;
            pctEl.textContent = pct.toFixed(2) + "%";
          }
        });
      } catch (e) {
        // ignore errors on pages that do not have expected layout
      }
    }
  };

  global.DemoWallet = DemoWallet;
})(window);
