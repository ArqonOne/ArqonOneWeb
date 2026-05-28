import { initPlanets } from "./planets.js";

const PROJECTS = [
      {
        key: "stable",
        name: "STable (Swing Table Component)",
        short: "STable",
        description:
          "Custom JTable wrapper with column filters, filter types, row numbering, and performance improvements for big datasets.",
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
        images: [],
        link: "https://github.com/ArqonOne",
      },
      {
        key: "giftlist",
        name: "Gift List Web App",
        short: "Email client",
        description:
          "Simple web app to share gift ideas and mark items as purchased so friends don’t duplicate gifts.",
        images: [],
        link: "#",
      },
      {
        key: "math",
        name: "Math Practice Platform",
        short: "",
        description:
          "Interactive math practice engine with step-by-step solutions, structured question bank, and dynamic UI widgets.",
        images: [],
        link: "#",
      },
      {
        key: "shopify",
        name: "Shopify Theme Tooling",
        short: "Selios",
        description:
          "Theme customization and internal tooling to speed up content and template workflows.",
        images: [],
        link: "#",
      },
      {
        key: "android",
        name: "Android UI Components",
        short: "Android",
        description:
          "Fragments + RecyclerView based screens with custom components and consistent UX patterns.",
        images: [],
        link: "#",
      },
      {
        key: "db",
        name: "Order / Display SQL Tooling",
        short: "SQL Tooling",
        description:
          "Java desktop tooling for orders/displays backed by SQL Server; CRUD, imports, and data conversion utilities.",
        images: [],
        link: "#",
      },
    ];

const planetsDef = [
      { name: PROJECTS[0].short, x: 0, y: 0.52, r: 26, ring: false, look: { type: "marble", outline: 2.4, jitter: 1.2, passes: 2, hatchAlpha: 0.55 } },
      { name: PROJECTS[1].short, x: 0.18, y: 0.52, r: 56, ring: false, look: { type: "crater", outline: 3.2, jitter: 1.4, passes: 2, craterCount: 7 } },
      { name: PROJECTS[2].short, x: 0.30, y: 0.52, r: 34, ring: false, look: { type: "split", outline: 2.6, jitter: 1.2, passes: 2, shadowSide: +1 } },
      { name: PROJECTS[3].short, x: 0.42, y: 0.52, r: 40, ring: false, look: { type: "belt", outline: 2.8, jitter: 1.8, passes: 2, beltCount: 4 } },
      { name: PROJECTS[4].short, x: 0.60, y: 0.52, r: 84, ring: false, look: { type: "halo", outline: 3.6, jitter: 1.1, passes: 2, halo: 0.9 } },
      { name: PROJECTS[5].short, x: 0.78, y: 0.52, r: 52, ring: true, look: { type: "ringed", outline: 2.8, jitter: 1.2, passes: 2, ringWidth: 2.8, ringDouble: true } },
      { name: PROJECTS[6].short, x: 0.92, y: 0.52, r: 46, ring: false, look: { type: "dots", outline: 2.2, jitter: 1.5, passes: 2, dotDensity: 0.016 } },
    ];

// ===== Popup + carousel wiring =====
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

let activeProject = null;
let activeIndex = 0;

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
initPlanets({
  canvasId: "planetsCanvas",
  tipId: "planetsTip",
  containerId: "planetsBlock",
  planetsDef,
  onSelect: (payload) => {
    const planet = payload?.planet;
    const anchorX = payload?.anchorX ?? 0;
    const anchorY = payload?.anchorY ?? 0;

    if (!planet) return;
    const project = PROJECTS[planet.id - 1]; // planet.id is 1-based
  },
});
