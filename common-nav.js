// common-nav.js
// Mobile bottom navigation handler.

(function () {
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    var nav = document.querySelector(".bottom-nav");
    if (!nav) return;

    var items = nav.querySelectorAll(".bottom-item");
    if (!items || !items.length) return;

    function goTo(page) {
      if (!page) return;
      window.location.href = page;
    }

    items.forEach(function (item) {
      item.addEventListener("click", function () {
        if (item.classList.contains("nav-ai-tools")) {
          goTo("content.html");
        } else if (item.classList.contains("nav-room-task")) {
          goTo("room-task.html");
        } else if (item.classList.contains("nav-run-record")) {
          goTo("run-record.html");
        } else if (item.classList.contains("nav-task-center")) {
          goTo("task-center.html");
        } else if (item.classList.contains("nav-ai-power")) {
          goTo("ai-power.html");
        } else if (item.classList.contains("nav-assets")) {
          goTo("my-assets.html");
        } else if (item.classList.contains("nav-mine")) {
          goTo("mine.html");
        } else if (item.dataset && item.dataset.href) {
          goTo(item.dataset.href);
        }
      });
    });
  });
})();