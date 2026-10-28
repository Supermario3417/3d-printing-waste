const navigationGroups = [
    {
        key: "pv",
        name: "Problem Validation",
        elements: [
            { letter: "A", title: "Problem Justification" },
            { letter: "B", title: "Product & Patent Research" },
            { letter: "C" }
        ]
    },
    {
        key: "sd",
        name: "Solution Design",
        elements: [
            { letter: "D" },
            { letter: "E" },
            { letter: "F" }
        ]
    },
    {
        key: "pt",
        name: "Prototyping and Testing",
        elements: [
            { letter: "G" },
            { letter: "H" },
            { letter: "I" }
        ]
    },
    {
        key: "pe",
        name: "Project Evaluation",
        elements: [
            { letter: "J" },
            { letter: "K" },
            { letter: "L" }
        ]
    }
];

function createNavigationLink(label, href, pageId) {
    const link = document.createElement("a");
    link.className = "navlink";
    link.href = href;
    link.textContent = label;
    link.dataset.nav = pageId;

    return link;
}

function createDropdown(group, basePath, currentPage) {
    const item = document.createElement("li");
    item.className = "dd";
    item.dataset.group = group.key;

    const button = document.createElement("button");
    button.className = "navbtn";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = `${group.name}<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8"></path></svg>`;

    const menu = document.createElement("ul");
    menu.className = "submenu";
    menu.hidden = true;

    for (const element of group.elements) {
        const pageId = `element-${element.letter.toLowerCase()}`;
        const menuItem = document.createElement("li");
        const link = document.createElement("a");
        link.href = `${basePath}pages/elements/${pageId}.html`;
        link.dataset.nav = pageId;

        const label = document.createElement("span");
        label.textContent = `Element ${element.letter}`;
        link.appendChild(label);

        if (element.title) {
            const description = document.createElement("small");
            description.textContent = element.title;
            link.appendChild(description);
        }

        if (pageId === currentPage) {
            link.setAttribute("aria-current", "page");
            button.classList.add("current");
        }

        menuItem.appendChild(link);
        menu.appendChild(menuItem);
    }

    item.append(button, menu);
    return item;
}

function createNavigation(basePath, currentPage) {
    const topbar = document.createElement("nav");
    topbar.className = "topbar";
    topbar.id = "topbar";
    topbar.setAttribute("aria-label", "Site");

    const topbarInner = document.createElement("div");
    topbarInner.className = "topbar-inner";

    const brand = document.createElement("a");
    brand.className = "brand";
    brand.href = `${basePath}index.html`;
    brand.innerHTML = '<span class="brand-mark">PLTW</span>3D Printing Waste';

    const menuToggle = document.createElement("button");
    menuToggle.className = "menu-toggle";
    menuToggle.id = "menu-toggle";
    menuToggle.type = "button";
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-controls", "navlist");
    menuToggle.textContent = "Menu";

    const navList = document.createElement("ul");
    navList.className = "navlist";
    navList.id = "navlist";

    const homeItem = document.createElement("li");
    homeItem.appendChild(createNavigationLink("Home", `${basePath}index.html`, "home"));
    navList.appendChild(homeItem);

    for (const group of navigationGroups) {
        navList.appendChild(createDropdown(group, basePath, currentPage));
    }

    const simplePages = [
        { label: "Team", id: "team", path: "pages/team/index.html" },
        { label: "Notebook", id: "notebook", path: "pages/notebook/index.html" },
        {
            label: "Milestone Presentations",
            id: "milestones",
            path: "pages/milestones/index.html"
        }
    ];

    for (const page of simplePages) {
        const item = document.createElement("li");
        const link = createNavigationLink(
            page.label,
            `${basePath}${page.path}`,
            page.id
        );

        if (page.id === currentPage) {
            link.setAttribute("aria-current", "page");
        }

        item.appendChild(link);
        navList.appendChild(item);
    }

    const currentLink = navList.querySelector(`[data-nav="${currentPage}"]`);
    if (currentLink) {
        currentLink.setAttribute("aria-current", "page");
    }

    topbarInner.append(brand, menuToggle, navList);
    topbar.appendChild(topbarInner);
    return { topbar, navList, menuToggle };
}

function closeDropdowns(dropdowns, except = null) {
    for (const dropdown of dropdowns) {
        if (dropdown === except) {
            continue;
        }

        dropdown.querySelector(".navbtn").setAttribute("aria-expanded", "false");
        dropdown.querySelector(".submenu").hidden = true;
    }
}

function initializeNavigation() {
    const navigationHost = document.getElementById("site-navigation");
    if (!navigationHost) {
        throw new Error('The page is missing the "site-navigation" container.');
    }

    const basePath = document.body.dataset.basePath;
    const currentPage = document.body.dataset.currentPage;
    const { topbar, navList, menuToggle } = createNavigation(basePath, currentPage);
    navigationHost.appendChild(topbar);

    const dropdowns = Array.from(navList.querySelectorAll(".dd"));

    for (const dropdown of dropdowns) {
        const button = dropdown.querySelector(".navbtn");
        const menu = dropdown.querySelector(".submenu");

        button.addEventListener("click", (event) => {
            event.stopPropagation();

            const isOpen = button.getAttribute("aria-expanded") === "true";
            closeDropdowns(dropdowns, dropdown);
            button.setAttribute("aria-expanded", String(!isOpen));
            menu.hidden = isOpen;
        });
    }

    document.addEventListener("click", (event) => {
        if (!topbar.contains(event.target)) {
            closeDropdowns(dropdowns);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDropdowns(dropdowns);
        }
    });

    menuToggle.addEventListener("click", () => {
        const isOpen = topbar.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.textContent = isOpen ? "Close" : "Menu";
    });
}

function initializeBackgroundParallax() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
        return;
    }

    let updateScheduled = false;

    function updateBackgroundPosition() {
        const scrollPosition = window.scrollY;
        const root = document.documentElement;

        root.style.setProperty("--background-scroll-y", `${scrollPosition * 0.22}px`);
        updateScheduled = false;
    }

    function scheduleBackgroundUpdate() {
        if (updateScheduled) {
            return;
        }

        updateScheduled = true;
        window.requestAnimationFrame(updateBackgroundPosition);
    }

    window.addEventListener("scroll", scheduleBackgroundUpdate, { passive: true });
    window.addEventListener("resize", scheduleBackgroundUpdate);
    updateBackgroundPosition();
}

initializeNavigation();
initializeBackgroundParallax();
