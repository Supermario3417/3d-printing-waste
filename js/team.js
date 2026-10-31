const root = document.documentElement;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

function getTheme() {
    const selectedTheme = root.getAttribute("data-theme");
    if (selectedTheme === "light" || selectedTheme === "dark") {
        return selectedTheme;
    }

    return systemTheme.matches ? "dark" : "light";
}

function getPlaceholderUrl() {
    const basePath = document.body.dataset.basePath;
    if (!basePath) {
        throw new Error('The Team page is missing the "data-base-path" value.');
    }

    const placeholderName = getTheme() === "dark" ? "PlaceholderDark.png" : "PlaceholderLight.png";
    return new URL(`${basePath}images/Team/${placeholderName}`, document.baseURI).href;
}

function showPlaceholder(image) {
    image.dataset.placeholderActive = "true";
    image.src = getPlaceholderUrl();
}

function updatePhotoPlaceholders() {
    const placeholderUrl = getPlaceholderUrl();

    for (const image of document.querySelectorAll(".photo")) {
        if (image.dataset.placeholderActive === "true") {
            image.src = placeholderUrl;
            continue;
        }

        if (!image.getAttribute("src")?.trim() || (image.complete && image.naturalWidth === 0)) {
            showPlaceholder(image);
        }
    }
}

for (const image of document.querySelectorAll(".photo")) {
    image.addEventListener("error", () => {
        if (image.dataset.placeholderActive !== "true") {
            showPlaceholder(image);
        }
    });
}

updatePhotoPlaceholders();
systemTheme.addEventListener("change", updatePhotoPlaceholders);
new MutationObserver(updatePhotoPlaceholders).observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"]
});
