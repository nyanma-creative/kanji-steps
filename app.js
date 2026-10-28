/* Kanji Steps — Learn / Quiz / Search. Plain JS, no dependencies. */
(function () {
  "use strict";

  var data = (typeof KANJI_DATA !== "undefined") ? KANJI_DATA : [];

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function categoriesInOrder(list) {
    var seen = [], map = {};
    list.forEach(function (e) {
      if (!map[e.category]) { map[e.category] = []; seen.push(e.category); }
      map[e.category].push(e);
    });
    return seen.map(function (c) { return { name: c, items: map[c] }; });
  }

  /* ---------- Learn view ---------- */
  var learnContainer = $("learn-container");
  var noResults = $("no-results");
  var searchInput = $("search-input");
  var searchCount = $("search-count");

  function renderLearn(list) {
    learnContainer.innerHTML = "";
    categoriesInOrder(list).forEach(function (group) {
      var title = document.createElement("h2");
      title.className = "category-title";
      title.textContent = group.name + " (" + group.items.length + ")";
      learnContainer.appendChild(title);

      var grid = document.createElement("div");
      grid.className = "kanji-grid";
      group.items.forEach(function (entry) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "kanji-card";
        var k = document.createElement("span");
        k.className = "k"; k.textContent = entry.kanji;
        var m = document.createElement("span");
        m.className = "m"; m.textContent = entry.meaning_en;
        btn.appendChild(k); btn.appendChild(m);
        btn.addEventListener("click", function () { openDetail(entry); });
        grid.appendChild(btn);
      });
      learnContainer.appendChild(grid);
    });
    noResults.hidden = list.length > 0;
    searchCount.textContent = searchInput.value.trim()
      ? list.length + " of " + data.length + " kanji"
      : "";
  }

  function matches(entry, q) {
    q = q.toLowerCase();
    return entry.kanji.indexOf(q) !== -1
      || entry.on_yomi.toLowerCase().indexOf(q) !== -1
      || entry.kun_yomi.toLowerCase().indexOf(q) !== -1
      || entry.meaning_en.toLowerCase().indexOf(q) !== -1;
  }

  searchInput.addEventListener("input", function () {
    var q = searchInput.value.trim();
    renderLearn(q ? data.filter(function (e) { return matches(e, q); }) : data);
  });

  /* ---------- Detail dialog ---------- */
  var dialog = $("detail-dialog");
  function openDetail(entry) {
    $("detail-kanji").textContent = entry.kanji;
    $("detail-meaning").textContent = entry.meaning_en;
    $("detail-on").textContent = entry.on_yomi;
    $("detail-kun").textContent = entry.kun_yomi;
    $("detail-category").textContent = "Category: " + entry.category;
    var ul = $("detail-examples");
    ul.innerHTML = "";
    entry.examples.forEach(function (ex) {
      var li = document.createElement("li");
      var jp = document.createElement("span"); jp.className = "jp"; jp.textContent = ex.jp;
      var rd = document.createElement("span"); rd.className = "reading"; rd.textContent = ex.reading;
      var en = document.createElement("span"); en.className = "en"; en.textContent = ex.en;
      li.appendChild(jp); li.appendChild(rd); li.appendChild(en);
      ul.appendChild(li);
    });
    try {
      if (typeof dialog.showModal === "function") { dialog.showModal(); }
      else { dialog.setAttribute("open", ""); }
    } catch (e) { dialog.setAttribute("open", ""); }
  }
  function closeDetail() {
    try { dialog.close(); } catch (e) { /* fall through */ }
    dialog.removeAttribute("open");
  }
  $("detail-close").addEventListener("click", closeDetail);
  dialog.addEventListener("click", function (ev) { if (ev.target === dialog) { closeDetail(); } });

  /* ---------- Tabs ---------- */
  var viewLearn = $("view-learn"), viewQuiz = $("view-quiz");
  var tabLearn = $("tab-learn"), tabQuiz = $("tab-quiz");
  var searchBox = $("search-box");
  function showView(which) {
    var learn = which === "learn";
    viewLearn.hidden = !learn;
    viewQuiz.hidden = learn;
    searchBox.style.display = learn ? "" : "none";
    tabLearn.classList.toggle("active", learn);
    tabQuiz.classList.toggle("active", !learn);
  }
  tabLearn.addEventListener("click", function () { showView("learn"); });
  tabQuiz.addEventListener("click", function () { showView("quiz"); });

  /* ---------- Quiz ---------- */
  var QUESTIONS = 10;
  var quiz = null; // {items, idx, score, missed:[], answered}

  function pickChoices(entry) {
    var pool = shuffle(data.filter(function (e) {
      return e.kanji !== entry.kanji && e.meaning_en !== entry.meaning_en;
    }));
    var picked = [], used = {};
    used[entry.meaning_en] = true;
    for (var i = 0; i < pool.length && picked.length < 3; i++) {
      if (!used[pool[i].meaning_en]) { picked.push(pool[i].meaning_en); used[pool[i].meaning_en] = true; }
    }
    return shuffle(picked.concat([entry.meaning_en]));
  }

  function startQuiz() {
    quiz = { items: shuffle(data).slice(0, QUESTIONS), idx: 0, score: 0, missed: [], answered: false };
    $("quiz-start").hidden = true;
    $("quiz-result").hidden = true;
    $("quiz-play").hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    var entry = quiz.items[quiz.idx];
    quiz.answered = false;
    $("quiz-progress").textContent = "Question " + (quiz.idx + 1) + " of " + quiz.items.length;
    $("quiz-kanji").textContent = entry.kanji;
    var feedback = $("quiz-feedback");
    feedback.textContent = "";
    feedback.className = "quiz-feedback";
    $("quiz-next-btn").hidden = true;

    var box = $("quiz-choices");
    box.innerHTML = "";
    pickChoices(entry).forEach(function (meaning) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn";
      b.textContent = meaning;
      b.addEventListener("click", function () { answer(b, entry, meaning); });
      box.appendChild(b);
    });
  }

  function answer(btn, entry, chosen) {
    if (quiz.answered) return;
    quiz.answered = true;
    var correct = chosen === entry.meaning_en;
    var buttons = $("quiz-choices").querySelectorAll(".choice-btn");
    buttons.forEach(function (b) {
      b.disabled = true;
      if (b.textContent === entry.meaning_en) { b.classList.add("correct"); }
    });
    var feedback = $("quiz-feedback");
    if (correct) {
      quiz.score++;
      feedback.textContent = "Correct!";
      feedback.classList.add("right");
    } else {
      btn.classList.add("incorrect");
      quiz.missed.push(entry);
      feedback.textContent = "Not quite — " + entry.kanji + " means “" + entry.meaning_en + "”.";
      feedback.classList.add("wrong");
    }
    var next = $("quiz-next-btn");
    next.textContent = (quiz.idx + 1 < quiz.items.length) ? "Next" : "See results";
    next.hidden = false;
  }

  $("quiz-next-btn").addEventListener("click", function () {
    quiz.idx++;
    if (quiz.idx < quiz.items.length) { renderQuestion(); } else { showResult(); }
  });

  function showResult() {
    $("quiz-play").hidden = true;
    $("quiz-result").hidden = false;
    $("quiz-score").textContent = "Score: " + quiz.score + " / " + quiz.items.length;
    var review = $("quiz-review");
    review.innerHTML = "";
    quiz.missed.forEach(function (entry) {
      var li = document.createElement("li");
      var rk = document.createElement("span"); rk.className = "rk"; rk.textContent = entry.kanji;
      var rm = document.createElement("span"); rm.className = "rm"; rm.textContent = entry.meaning_en;
      var rr = document.createElement("span"); rr.className = "rr";
      rr.textContent = entry.on_yomi + " / " + entry.kun_yomi;
      li.appendChild(rk); li.appendChild(rm); li.appendChild(rr);
      review.appendChild(li);
    });
    $("quiz-review-wrap").hidden = quiz.missed.length === 0;
    $("quiz-perfect").hidden = quiz.missed.length !== 0;
  }

  $("quiz-start-btn").addEventListener("click", startQuiz);
  $("quiz-retry-btn").addEventListener("click", startQuiz);

  /* ---------- init ---------- */
  renderLearn(data);
})();
