const radarSections = [...document.querySelectorAll(".minimap-radar__blip")]
  .map((link) => {
    const id = link.hash.slice(1);
    const target = document.getElementById(id);
    return { id, link, target };
  })
  .filter(({ id, target }) => id && target);

let lastScrollTop = -1;
let lastActiveId = "";

function pageScrollTop() {
  return window.scrollY
    || window.pageYOffset
    || document.scrollingElement?.scrollTop
    || document.documentElement.scrollTop
    || document.body.scrollTop
    || 0;
}

function setActiveRadarBlip(id) {
  if (!id || id === lastActiveId) return;
  lastActiveId = id;

  for (const section of radarSections) {
    const active = section.id === id;
    section.link.classList.toggle("is-active", active);
    section.link.setAttribute("aria-current", active ? "location" : "false");
  }
}

function currentSectionId() {
  let current = radarSections[0]?.id;
  const activationLine = 140;

  for (const section of radarSections) {
    const rect = section.target.getBoundingClientRect();
    if (rect.top <= activationLine) current = section.id;
  }

  return current;
}

function updateRadar() {
  setActiveRadarBlip(currentSectionId());
}

function watchScrollPosition() {
  const scrollTop = pageScrollTop();
  if (scrollTop !== lastScrollTop) {
    lastScrollTop = scrollTop;
    updateRadar();
  }
  requestAnimationFrame(watchScrollPosition);
}

for (const { id, link, target } of radarSections) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActiveRadarBlip(id);
  });
}

window.addEventListener("resize", updateRadar);
window.addEventListener("load", updateRadar);
updateRadar();
setTimeout(updateRadar, 0);
requestAnimationFrame(watchScrollPosition);
