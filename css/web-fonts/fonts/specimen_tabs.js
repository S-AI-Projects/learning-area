(function () {
  const container = document.getElementById("container");
  const tabList = container && container.querySelector(".tabs");
  const mainContent = container && container.querySelector("#main_content");

  if (!tabList || !mainContent) {
    return;
  }

  const tabPanels = Array.from(tabList.querySelectorAll('a[href^="#"]'))
    .map((link) => ({
      link,
      panel: document.getElementById(link.hash.slice(1)),
    }))
    .filter(({ panel }) => panel && mainContent.contains(panel));

  if (tabPanels.length === 0) {
    return;
  }

  const handlerKey = "__zantrokeTabsClickHandler";
  if (tabList[handlerKey]) {
    tabList.removeEventListener("click", tabList[handlerKey]);
  }

  const currentPanel =
    tabPanels.find(({ link }) => link.hash === window.location.hash) ||
    tabPanels.find(({ link }) => link.parentElement.classList.contains("active")) ||
    tabPanels[0];

  function activateTab(selectedPanel) {
    if (
      selectedPanel.link.parentElement.classList.contains("active") &&
      !selectedPanel.panel.hidden
    ) {
      return;
    }

    tabPanels.forEach(({ link, panel }) => {
      const selected = panel === selectedPanel.panel;
      link.parentElement.classList.toggle("active", selected);
      panel.hidden = !selected;

      if (selected) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  tabPanels.forEach(({ link, panel }) => {
    const selected = panel === currentPanel.panel;
    link.parentElement.classList.toggle("active", selected);
    panel.hidden = !selected;

    if (selected) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const clickHandler = (event) => {
    const target = event.target instanceof Element && event.target.closest("a");
    const selectedPanel = tabPanels.find(({ link }) => link === target);

    if (!selectedPanel) {
      return;
    }

    event.preventDefault();
    activateTab(selectedPanel);
  };

  tabList.addEventListener("click", clickHandler);
  tabList[handlerKey] = clickHandler;
})();
