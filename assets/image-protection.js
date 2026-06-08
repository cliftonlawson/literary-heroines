(function () {
  var protectedSelector = "img, picture, video, canvas, svg";

  function hasBackgroundImage(element) {
    if (!element || element === document.documentElement) {
      return false;
    }

    var backgroundImage = window.getComputedStyle(element).backgroundImage;
    return backgroundImage && backgroundImage !== "none";
  }

  function isProtectedTarget(target) {
    var element = target instanceof Element ? target : target.parentElement;

    while (element && element !== document.documentElement) {
      if (element.matches(protectedSelector) || hasBackgroundImage(element)) {
        return true;
      }

      element = element.parentElement;
    }

    return false;
  }

  function protectImages(root) {
    root.querySelectorAll("img").forEach(function (image) {
      image.setAttribute("draggable", "false");
    });
  }

  document.addEventListener(
    "contextmenu",
    function (event) {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    },
    true
  );

  document.addEventListener(
    "dragstart",
    function (event) {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    },
    true
  );

  protectImages(document);

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          protectImages(node);
        }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
