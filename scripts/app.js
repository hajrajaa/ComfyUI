// Shim for scripts/app.ts
export const ANIM_PREVIEW_WIDGET = window.comfyAPI.app.ANIM_PREVIEW_WIDGET;
export const ComfyApp = window.comfyAPI.app.ComfyApp;
export const app = window.comfyAPI.app.app;



// Save original method
const originalGetNodeMenuOptions = LiteGraph.LGraphCanvas.prototype.getNodeMenuOptions;

LiteGraph.LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
    // Get original options
    let options = originalGetNodeMenuOptions ? originalGetNodeMenuOptions.call(this, node) : [];

    // Ensure options array exists
    options = options || [];

    // Add your custom option specifically for your node type
    if (node.type === "PaintNode") {
        // Add divider line if existing options aren't empty
        if (options.length > 0 && options[options.length - 1] !== null) {
            options.push(null);
        }

        options.push({
            content: "Open Painter Editor",
            callback: () => openPainterEditor(node)
        });
    }

    return options;
};

function openPainterEditor(node) {
    const modal = document.getElementById("painter-modal");
    const canvas = document.getElementById("painter-canvas");
    const ctx = canvas.getContext("2d");

    modal.style.display = "flex";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let drawing = false;
    let erasing = false;
    let activeMode = null;

    const img = new Image();
    const nodeImageUrl = `/view?filename=${encodeURIComponent(node.widgets[0].value)}&type=input`;
    img.src = nodeImageUrl;

    let imgX, imgY, imgWidth, imgHeight;

    img.onload = () => {
        const aspectRatio = img.width / img.height;
        if (canvas.width / aspectRatio <= canvas.height) {
            imgWidth = canvas.width * 0.8;
            imgHeight = imgWidth / aspectRatio;
        } else {
            imgHeight = canvas.height * 0.8;
            imgWidth = imgHeight * aspectRatio;
        }

        imgX = (canvas.width - imgWidth) / 2;
        imgY = (canvas.height - imgHeight) / 2;

        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
    };

    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 5;

    // Create a cursor preview (ONLY inside the painting area)
    const toolCursor = document.createElement("img");
    toolCursor.style.position = "absolute";
    toolCursor.style.width = "40px";
    toolCursor.style.height = "40px";
    toolCursor.style.pointerEvents = "none";
    toolCursor.style.display = "none";
    toolCursor.style.zIndex = "1001"; // Ensure it appears above canvas
    modal.appendChild(toolCursor); // Attach it inside the modal

    // Handle cursor movement (only inside image)
    canvas.addEventListener("mousemove", (e) => {
        if (activeMode) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x >= imgX && x <= imgX + imgWidth && y >= imgY && y <= imgY + imgHeight) {
                toolCursor.style.display = "block";
                toolCursor.style.left = `${e.clientX - 15}px`;
                toolCursor.style.top = `${e.clientY - 15}px`;
            } else {
                toolCursor.style.display = "none";
            }
        }

        if (drawing && activeMode) {
            if (e.offsetX >= imgX && e.offsetX <= imgX + imgWidth &&
                e.offsetY >= imgY && e.offsetY <= imgY + imgHeight) {
                ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
                ctx.lineTo(e.offsetX, e.offsetY);
                ctx.stroke();
            }
        }
    });

    // Start drawing inside the image
    canvas.addEventListener("mousedown", (e) => {
        if (activeMode && e.offsetX >= imgX && e.offsetX <= imgX + imgWidth &&
            e.offsetY >= imgY && e.offsetY <= imgY + imgHeight) {
            drawing = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        }
    });

    // Stop drawing
    canvas.addEventListener("mouseup", () => {
        drawing = false;
    });

    // Draw Mode
    document.getElementById("draw-mode").addEventListener("click", () => {
        activeMode = "draw";
        erasing = false;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "#FFF"; // White brush
        ctx.lineWidth = 5;
        toolCursor.src = "icons/paint.png"; // Brush icon
    });

    // Erase Mode (only erases white strokes, not background)
    document.getElementById("erase-mode").addEventListener("click", () => {
        activeMode = "erase";
        erasing = true;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "black"; // Use black to erase white strokes only
        ctx.lineWidth = 20;
        toolCursor.src = "icons/eraser.png"; // Eraser icon
    });

    // Clear drawing 
    document.getElementById("clear-painting").addEventListener("click", () => {
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
    });

    // Close Painter
    document.getElementById("close-painter").addEventListener("click", () => {
        modal.style.display = "none";
        toolCursor.style.display = "none";
    });

    //Save the edited image
    document.getElementById("save-painting").addEventListener("click", async () => {
        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = imgWidth;
        croppedCanvas.height = imgHeight;
        const croppedCtx = croppedCanvas.getContext("2d");

        // Draw the modified image onto the cropped canvas
        croppedCtx.drawImage(canvas, imgX, imgY, imgWidth, imgHeight, 0, 0, imgWidth, imgHeight);

        croppedCanvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("image", blob, "edited_painting.png");

            try {
                const response = await fetch("/upload/image", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const result = await response.json();
                    if (!result.filename || result.filename === "undefined") {
                        throw new Error("No filename returned from the server.");
                    }

                    const newImagePath = result.filename;
                    node.widgets[0].value = newImagePath;
                    node.setProperty("image", newImagePath);

                    const timestamp = new Date().getTime();
                    const newImageUrl = `/view?filename=${encodeURIComponent(newImagePath)}&type=input&_=${timestamp}`;

                    setTimeout(() => {
                        node.widgets[0].value = newImagePath;
                        node.setProperty("image", newImagePath);
                        node.graph._version++;
                        node.graph.dirty_canvas = true;
                        node.graph.dirty_bgcanvas = true;
                        app.graph.change();
                    }, 1);

                    const painterNode = document.querySelector(`.comfy-node[data-nodeid='${node.id}']`);
                    if (painterNode) {
                        const imgElement = painterNode.querySelector("img");
                        if (imgElement) {
                            imgElement.src = newImageUrl;
                        }
                    }

                    alert(`Painting saved as ${newImagePath} and updated!`);
                } else {
                    const errorText = await response.text();
                    alert(`Failed to save painting: ${errorText}`);
                }
            } catch (error) {
                alert(`Error saving painting: ${error.message}`);
            }
        }, "image/png");

        modal.style.display = "none";
        toolCursor.style.display = "none";
    });

}











