const basePath = document.body.dataset.basePath;
const presentationList = document.querySelector("#presentation-list");
const presentationTitle = document.querySelector("#presentation-title");
const slideImage = document.querySelector("#slide-image");
const slideCount = document.querySelector("#slide-count");
const presentationLoader = document.querySelector("#presentation-loader");
const viewerStatus = document.querySelector("#viewer-status");
const previousButton = document.querySelector("#previous-slide");
const nextButton = document.querySelector("#next-slide");
const fullscreenButton = document.querySelector("#fullscreen-control");
const slideFrame = document.querySelector(".slide-frame");

const imageExtensions = ["png", "jpg"];
const loadingScreenDuration = 500;
const controlsIdleDelay = 5000;
const presentationExtensions = new Map();
let presentations = [];
let currentPresentation = null;
let currentSlide = 1;
let loadRequest = 0;
let controlsIdleTimer;

function updatePresentationListScrollbarSpacing() {
    presentationList.classList.toggle(
        "has-scrollbar",
        presentationList.scrollHeight > presentationList.clientHeight
    );
}

const presentationListResizeObserver = new ResizeObserver(updatePresentationListScrollbarSpacing);
presentationListResizeObserver.observe(presentationList);

function showError(message, error) {
    console.error(message, error);
    presentationLoader.hidden = true;
    viewerStatus.textContent = message;
    slideImage.hidden = true;
    previousButton.disabled = true;
    nextButton.disabled = true;
}

function findSlide(presentation, slideNumber) {
    return new Promise((resolve) => {
        const selectedExtension = presentationExtensions.get(presentation.folder);
        const extensions = selectedExtension
            ? [selectedExtension, ...imageExtensions.filter((extension) => extension !== selectedExtension)]
            : imageExtensions;
        let extensionIndex = 0;

        function tryNextExtension() {
            if (extensionIndex >= extensions.length) {
                resolve(null);
                return;
            }

            const extension = extensions[extensionIndex];
            extensionIndex += 1;
            const imageUrl = new URL(
                `${basePath}presentations/${encodeURIComponent(presentation.folder)}/${slideNumber}.${extension}`,
                document.baseURI
            );
            const probe = new Image();
            probe.onload = () => {
                presentationExtensions.set(presentation.folder, extension);
                resolve(imageUrl.href);
            };
            probe.onerror = tryNextExtension;
            probe.src = imageUrl.href;
        }

        tryNextExtension();
    });
}

function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function showSlideControls() {
    window.clearTimeout(controlsIdleTimer);
    slideFrame.classList.remove("controls-idle");
    controlsIdleTimer = window.setTimeout(() => {
        slideFrame.classList.add("controls-idle");
    }, controlsIdleDelay);
}

async function showSlide(slideNumber, isPresentationSelection = false) {
    const request = ++loadRequest;
    previousButton.disabled = true;
    nextButton.disabled = true;
    viewerStatus.textContent = "";
    const loadingStartedAt = Date.now();

    try {
        const [imageUrl] = await Promise.all([
            findSlide(currentPresentation, slideNumber),
            isPresentationSelection
                ? delay(Math.max(0, loadingScreenDuration - (Date.now() - loadingStartedAt)))
                : Promise.resolve()
        ]);
        if (request !== loadRequest) {
            return;
        }

        if (!imageUrl) {
            throw new Error(`Slide ${slideNumber} was not found in "${currentPresentation.folder}".`);
        }

        slideImage.src = imageUrl;
        slideImage.alt = `${currentPresentation.title}, slide ${slideNumber}`;
        slideImage.hidden = false;
        currentSlide = slideNumber;
        slideCount.textContent = `Slide ${currentSlide}`;
        if (isPresentationSelection) {
            presentationLoader.hidden = true;
        }
        showSlideControls();

        const [previousSlide, nextSlide] = await Promise.all([
            currentSlide > 1 ? findSlide(currentPresentation, currentSlide - 1) : null,
            findSlide(currentPresentation, currentSlide + 1)
        ]);
        if (request !== loadRequest) {
            return;
        }

        previousButton.disabled = !previousSlide;
        nextButton.disabled = !nextSlide;
    } catch (error) {
        if (request === loadRequest) {
            presentationLoader.hidden = true;
            showError(`Unable to load ${currentPresentation.title}.`, error);
        }
    }
}

function selectPresentation(presentation, selectedButton) {
    currentPresentation = presentation;
    currentSlide = 1;
    presentationTitle.textContent = presentation.title;
    for (const button of presentationList.querySelectorAll(".presentation-option")) {
        button.setAttribute("aria-pressed", String(button === selectedButton));
    }
    slideImage.hidden = true;
    slideCount.textContent = "";
    viewerStatus.textContent = "";
    presentationLoader.hidden = false;
    showSlide(1, true);
}

function renderPresentations() {
    presentationList.replaceChildren();

    for (const presentation of presentations) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.className = "presentation-option";
        button.type = "button";
        button.textContent = presentation.title;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => selectPresentation(presentation, button));
        item.append(button);
        presentationList.append(item);
        presentationListResizeObserver.observe(button);
    }

    updatePresentationListScrollbarSpacing();

    if (presentations.length === 0) {
        viewerStatus.textContent = "No presentations are available yet.";
    }
}

async function loadPresentations() {
    if (!basePath) {
        throw new Error('The milestones page is missing the "data-base-path" value.');
    }

    const response = await fetch(new URL(`${basePath}presentations/presentations.json`, document.baseURI));
    if (!response.ok) {
        throw new Error(`Could not load presentations.json (HTTP ${response.status}).`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.some((presentation) =>
        !presentation ||
        typeof presentation.title !== "string" ||
        !presentation.title.trim() ||
        typeof presentation.folder !== "string" ||
        !presentation.folder.trim() ||
        presentation.folder.includes("/") ||
        presentation.folder.includes("\\") ||
        presentation.folder === "." ||
        presentation.folder === ".."
    )) {
        throw new Error("presentations.json must contain presentation titles and folder names.");
    }

    presentations = data;
    renderPresentations();
}

function nextSlide()
{
    showSlide(currentSlide + 1);
}

function previousSlide()
{
    showSlide(currentSlide - 1);
}

previousButton.addEventListener("click", () => {
    if (currentPresentation && !previousButton.disabled) {
        previousSlide();
    }
});

nextButton.addEventListener("click", () => {
    if (currentPresentation && !nextButton.disabled) {
        nextSlide();
    }
});

for (const eventName of ["pointermove", "pointerdown", "focusin", "keydown"]) {
    slideFrame.addEventListener(eventName, showSlideControls);
}

fullscreenButton.addEventListener("click", async () => {
    try {
        if (document.fullscreenElement === slideFrame) {
            await document.exitFullscreen();
        } else if (slideFrame.requestFullscreen) {
            await slideFrame.requestFullscreen();
        } else {
            throw new Error("Fullscreen is not supported by this browser.");
        }
    } catch (error) {
        console.error("Unable to change fullscreen mode.", error);
        viewerStatus.textContent = "Unable to change fullscreen mode.";
    }
});

document.addEventListener("fullscreenchange", () => {
    const isFullscreen = document.fullscreenElement === slideFrame;
    fullscreenButton.textContent = isFullscreen ? "⛶ Exit fullscreen" : "⛶ Fullscreen";
    fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
    showSlideControls();
});

loadPresentations().catch((error) => {
    showError("Unable to load the presentation list.", error);
});