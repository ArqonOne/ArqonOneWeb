import { initPlanets } from "./planets.js";

const PROJECTS = [
      {
        key: "stable",
        name: "STable (Swing Table Component)",
        short: "STable",
        description:
          "Custom JTable wrapper with column filters, filter types, row numbering, and performance improvements for big datasets.",
        category: "Java UI",
        importance: 1,
        images: [
          // Add your screenshots here, e.g. "./assets/stable/1.png"
        ],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "map",
        name: "Map Panel + Route Planning",
        short: "Map",
        description:
          "Map UI with search (Nominatim), draggable interactions, markers, and planned routing visualization.",
        category: "Java Tooling",
        importance: 3,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "giftlist",
        name: "Gift List Web App",
        short: "Email client",
        description:
          "Simple web app to share gift ideas and mark items as purchased so friends don’t duplicate gifts.",
        category: "Web App",
        importance: 3,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "math",
        name: "Math Practice Platform",
        short: "",
        description:
          "Interactive math practice engine with step-by-step solutions, structured question bank, and dynamic UI widgets.",
        category: "Learning Platform",
        importance: 4,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "shopify",
        name: "Shopify Theme Tooling",
        short: "Selios",
        description:
          "Theme customization and internal tooling to speed up content and template workflows.",
        category: "Web Tooling",
        importance: 3,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "android",
        name: "Android UI Components",
        short: "Android",
        description:
          "Fragments + RecyclerView based screens with custom components and consistent UX patterns.",
        category: "Android",
        importance: 5,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "db",
        name: "Order / Display SQL Tooling",
        short: "SQL Tooling",
        description:
          "Java desktop tooling for orders/displays backed by SQL Server; CRUD, imports, and data conversion utilities.",
        category: "Database Tooling",
        importance: 5,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "test-orbit-a",
        name: "Test Project: Orbit Archive",
        short: "Archive",
        description:
          "Temporary project entry used to test overflow movement, planet selection, and popup positioning.",
        category: "Test Node",
        importance: 2,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "test-orbit-b",
        name: "Test Project: Lunar Notes",
        short: "Notes",
        description:
          "Temporary project entry used to make the planet row wider than the visible canvas.",
        category: "Test Node",
        importance: 1,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "test-orbit-c",
        name: "Test Project: Signal Board",
        short: "Signal",
        description:
          "Temporary project entry for checking auto-pan, hover pause, and click behavior.",
        category: "Test Node",
        importance: 3,
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "test-orbit-d",
        name: "Test Project: Docking UI",
        short: "Docking",
        description:
          "Temporary project entry for verifying the far-right planets become reachable.",
        category: "Test Node",
        importance: 2,
        images: [],
        link: "https://github.com/ArqonOne",
      },
    ];

const CATEGORY_PLANETS = {
  "Java UI": { ring: false, look: { type: "marble", outline: 2.4, jitter: 1.2, passes: 2, hatchAlpha: 0.55 } },
  "Java Tooling": { ring: false, look: { type: "crater", outline: 3.2, jitter: 1.4, passes: 2, craterCount: 7 } },
  "Web App": { ring: false, look: { type: "split", outline: 2.6, jitter: 1.2, passes: 2, shadowSide: +1 } },
  "Learning Platform": { ring: false, look: { type: "belt", outline: 2.8, jitter: 1.8, passes: 2, beltCount: 4 } },
  "Web Tooling": { ring: false, look: { type: "halo", outline: 3.6, jitter: 1.1, passes: 2, halo: 0.9 } },
  "Android": { ring: true, look: { type: "ringed", outline: 2.8, jitter: 1.2, passes: 2, ringWidth: 2.8, ringDouble: true } },
  "Database Tooling": { ring: false, look: { type: "dots", outline: 2.2, jitter: 1.5, passes: 2, dotDensity: 0.016 } },
  "Test Node": { ring: false, look: { type: "dots", outline: 2.2, jitter: 1.5, passes: 2, dotDensity: 0.016 } },
};

function projectPlanet(project, index) {
  const preset = CATEGORY_PLANETS[project.category] ?? CATEGORY_PLANETS["Test Node"];
  const importance = Math.max(1, Math.min(5, project.importance ?? 3));

  return {
    name: project.short || project.name || `Project ${index + 1}`,
    category: project.category,
    r: 24 + importance * 10,
    ring: preset.ring,
    look: { ...preset.look },
  };
}

const planetsDef = PROJECTS.map(projectPlanet);
const PROJECT_CATEGORIES = ["All", ...new Set(PROJECTS.map((project) => project.category))];

// ===== Popup + carousel wiring =====
const radarEl = document.getElementById("projectRadar");
const modal = document.getElementById("projectModal");
const panel = modal.querySelector(".pmodal__panel");
const titleEl = document.getElementById("pTitle");
const descEl = document.getElementById("pDesc");
const linkEl = document.getElementById("pLink");
const imgEl = document.getElementById("pImg");
const imgEmptyEl = document.getElementById("pImgEmpty");
const dotsEl = document.getElementById("pDots");
const prevBtn = document.getElementById("pPrev");
const nextBtn = document.getElementById("pNext");
panel.tabIndex = -1;

let activeProject = null;
let activeIndex = 0;
let closeTimer = null;
let planetsApi = null;

function renderProjectRadar() {
  if (!radarEl) return;

  const counts = PROJECTS.reduce((acc, project) => {
    acc[project.category] = (acc[project.category] ?? 0) + 1;
    return acc;
  }, { All: PROJECTS.length });

  radarEl.innerHTML = `
    <div class="project-radar__scope" aria-hidden="true">
      <span class="project-radar__sweep"></span>
      <span class="project-radar__ping project-radar__ping--a"></span>
      <span class="project-radar__ping project-radar__ping--b"></span>
      <span class="project-radar__ping project-radar__ping--c"></span>
    </div>
    <div class="project-radar__filters" role="list"></div>
  `;

  const filtersEl = radarEl.querySelector(".project-radar__filters");

  PROJECT_CATEGORIES.forEach((category, index) => {
    const button = document.createElement("button");
    button.className = `project-radar__filter${index === 0 ? " is-active" : ""}`;
    button.type = "button";
    button.dataset.category = category;
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    button.innerHTML = `
      <span>${category}</span>
      <small>${counts[category] ?? 0}</small>
    `;

    button.addEventListener("click", () => {
      filtersEl.querySelectorAll(".project-radar__filter").forEach((filterButton) => {
        const active = filterButton === button;
        filterButton.classList.toggle("is-active", active);
        filterButton.setAttribute("aria-pressed", active ? "true" : "false");
      });

      closeModal();
      planetsApi?.setFilterCategory(category);
    });

    filtersEl.appendChild(button);
  });
}

function positionPanel(anchorX, anchorY) {
  const margin = 12;
  const panelW = panel.offsetWidth || 420;
  const panelH = panel.offsetHeight || 420;

  let left = anchorX + 24;
  let top = anchorY - panelH / 2;

  if (left + panelW + margin > window.innerWidth) {
    left = anchorX - panelW - 24;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - panelW - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - panelH - margin));

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.setProperty("--pmodal-origin", `${anchorX - left}px ${anchorY - top}px`);
}

function openModal(project, anchorX, anchorY) {
  window.clearTimeout(closeTimer);
  activeProject = project;
  activeIndex = 0;

  titleEl.textContent = project.name;
  descEl.textContent = project.description;

  if (project.link && project.link !== "#") {
    linkEl.href = project.link;
    linkEl.hidden = false;
  } else {
    linkEl.hidden = true;
  }

  renderImage();

  modal.classList.add("pmodal--visible");
  modal.setAttribute("aria-hidden", "false");
  positionPanel(anchorX, anchorY);
  planetsApi?.setMotionPaused(true);

  requestAnimationFrame(() => {
    modal.classList.add("pmodal--open");
  });
}

function closeModal() {
  modal.classList.remove("pmodal--open");
  modal.setAttribute("aria-hidden", "true");
  activeProject = null;
  closeTimer = window.setTimeout(() => {
    modal.classList.remove("pmodal--visible");
  }, 220);
  planetsApi?.setMotionPaused(false);
}

function renderImage() {
  const images = activeProject?.images ?? [];
  const hasImages = images.length > 0;

  activeIndex = hasImages
    ? (activeIndex + images.length) % images.length
    : 0;

  imgEl.hidden = !hasImages;
  imgEmptyEl.hidden = hasImages;
  prevBtn.disabled = images.length <= 1;
  nextBtn.disabled = images.length <= 1;

  if (hasImages) {
    imgEl.src = images[activeIndex];
    imgEl.alt = `${activeProject.name} screenshot ${activeIndex + 1}`;
  } else {
    imgEl.removeAttribute("src");
    imgEl.alt = "";
  }

  dotsEl.innerHTML = "";
  images.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = `pmodal__dot${index === activeIndex ? " is-active" : ""}`;
    dot.type = "button";
    dot.setAttribute("aria-label", `Show image ${index + 1}`);
    dot.addEventListener("click", () => {
      activeIndex = index;
      renderImage();
    });
    dotsEl.appendChild(dot);
  });
}

function placeholderProject(planet) {
  return {
    name: planet.name,
    description:
      "Temporary placeholder planet. Add a matching entry in PROJECTS to show a real project description here.",
    images: [],
    link: "#",
  };
}

modal.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeModal();
});

// esc
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("pmodal--open")) closeModal();
});

// carousel controls
prevBtn.addEventListener("click", () => {
  if (!activeProject) return;
  activeIndex--;
  renderImage();
});

nextBtn.addEventListener("click", () => {
  if (!activeProject) return;
  activeIndex++;
  renderImage();
});

// ===== Planets init =====
renderProjectRadar();

planetsApi = initPlanets({
  canvasId: "planetsCanvas",
  tipId: "planetsTip",
  containerId: "planetsBlock",
  planetsDef,
  onSelect: (payload) => {
    const planet = payload?.planet;
    const anchorX = payload?.anchorX ?? 0;
    const anchorY = payload?.anchorY ?? 0;

    if (!planet) return;
    const project = PROJECTS[planet.id - 1] ?? placeholderProject(planet); // planet.id is 1-based

    openModal(project, anchorX, anchorY);
  },
});
