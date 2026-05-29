const radarLinks = [...document.querySelectorAll(".minimap-radar__blip")];
const radarSections = radarLinks
  .map((link) => ({
    link,
    id: link.getAttribute("href")?.slice(1),
    target: document.querySelector(link.getAttribute("href")),
  }))
  .filter((item) => item.id && item.target);

function setActiveRadarBlip(id) {
  radarSections.forEach(({ link }) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
  });
}

function updateRadarFromScroll() {
  if (!radarSections.length) return;

  const probeY = window.innerHeight * 0.36;
  let active = radarSections[0];
  let smallestDistance = Infinity;

  for (const section of radarSections) {
    const rect = section.target.getBoundingClientRect();
    const topDistance = Math.abs(rect.top - probeY);
    const containsProbe = rect.top <= probeY && rect.bottom >= probeY;
    const distance = containsProbe ? 0 : topDistance;

    if (distance < smallestDistance) {
      smallestDistance = distance;
      active = section;
    }
  }

  setActiveRadarBlip(active.id);
}

radarSections.forEach(({ link, target }) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${target.id}`);
    setActiveRadarBlip(target.id);
  });
});

window.addEventListener("scroll", updateRadarFromScroll, { passive: true });
window.addEventListener("resize", updateRadarFromScroll);
window.addEventListener("load", updateRadarFromScroll);
updateRadarFromScroll();
