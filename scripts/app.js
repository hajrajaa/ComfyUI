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

    // Set modal to fullscreen
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "transparent";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "9999";

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let drawing = false;
    let erasing = false;
    let activeMode = null;
    let orignalImage=null;


    const img = new Image();
    const nodeImageUrl = `/view?filename=${encodeURIComponent(node.widgets[0].value)}&type=input`;
    img.src = nodeImageUrl;

    // Clear background initially
    
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let imgX, imgY, imgWidth, imgHeight;

    img.onload = () => {
        // Ensure the image fits within the canvas while maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        if (img.width > canvas.width || img.height > canvas.height) {
            if (canvas.width / aspectRatio <= canvas.height) {
                imgWidth = canvas.width * 0.8; // Scale to 80% of canvas width
                imgHeight = imgWidth / aspectRatio;
            } else {
                imgHeight = canvas.height * 0.8; // Scale to 80% of canvas height
                imgWidth = imgHeight * aspectRatio;
            }
        } else {
            imgWidth = img.width;
            imgHeight = img.height;
        }

        // Center image
        imgX = (canvas.width - imgWidth) / 2;
        imgY = (canvas.height - imgHeight) / 2;

        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
        orignalImage = ctx.getImageData(0, 0, canvas.width, canvas.height); // Store original image

    };


    
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    //ctx.lineCap = "round";
    //ctx.globalCompositeOperation= "source-over";
    


    

canvas.onmousedown = (e) => {
    if (activeMode && e.offsetX >= imgX && e.offsetX <= imgX + imgWidth &&
        e.offsetY >= imgY && e.offsetY <= imgY + imgHeight) {
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    }
};

canvas.onmousemove = (e) => {
    if (drawing && activeMode) {
        if (erasing) {
            //ctx.putImageData(orignalImage, 0, 0); // Restore original image
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = 20; // Increase width for erasing
            ctx.strokeStyle = "rgba(0,0,0,1)"; // Black for erasing
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = "#FFF"; // White for drawing
        }
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    }
};

canvas.onmouseup = canvas.onmouseleave = () => {
    drawing = false;
    
    
};

document.getElementById("clear-painting").onclick = () => {
    ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
    orignalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
}


document.getElementById("erase-mode").onclick = () => {
    activeMode = "erase";
    erasing = true;
    //ctx.globalCompositeOperation = "source-over"; // Preserve image
    //ctx.strokeStyle = "rgba(0,0,0,0)"; // Make strokes transparent
    //ctx.lineWidth = 20;
}

document.getElementById("draw-mode").onclick = () => {
    activeMode='draw';
    erasing = false;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 5;
};


document.getElementById("save-painting").onclick = async () => {
    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = imgWidth;
    croppedCanvas.height = imgHeight;
    const croppedCtx = croppedCanvas.getContext("2d");
    croppedCtx.drawImage(canvas, imgX, imgY, imgWidth, imgHeight, 0, 0, imgWidth, imgHeight);

    croppedCanvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append("image", blob, "painting.png");  // The server will rename it properly

        try {
            const response = await fetch("/upload/image", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();

                // Ensure a valid filename is returned
                if (!result.filename || result.filename === "undefined") {
                    throw new Error("No filename returned from the server.");
                }

                const newImagePath = result.filename; // Correct new filename

                // Update the node with the new image
                node.widgets[0].value = newImagePath;
                node.setProperty("image", newImagePath);

                // Force Image Refresh by creating a new timestamped URL
                const timestamp = new Date().getTime(); 
                const newImageUrl = `/view?filename=${encodeURIComponent(newImagePath)}&type=input&_=${timestamp}`;

                // Update UI immediately
                setTimeout(() => {
                    node.widgets[0].value = newImagePath; // Ensure widget updates
                    node.setProperty("image", newImagePath);
                    node.graph._version++;
                    node.graph.dirty_canvas = true;
                    node.graph.dirty_bgcanvas = true;
                    app.graph.change();
                }, 1);  // Short delay to ensure UI refresh

                // Find the correct image element dynamically and update it
                const painterNode = document.querySelector(".comfy-node[data-nodeid='" + node.id + "']");
                if (painterNode) {
                    const imgElement = painterNode.querySelector("img"); // Find the image inside the node
                    if (imgElement) {
                        imgElement.src = newImageUrl; // Update the image source
                    }
                }

                alert(`Painting Saved as ${newImagePath} and Updated!`);
            } else {
                const errorText = await response.text();
                alert(`Failed to save painting: ${errorText}`);
            }
        } catch (error) {
            alert(`Error saving painting: ${error.message}`);
        }
    }, "image/png");
    modal.style.display = "none"; // Close the modal when saving 
};



document.getElementById("close-painter").onclick = () => {
    modal.style.display = "none";
};
}








