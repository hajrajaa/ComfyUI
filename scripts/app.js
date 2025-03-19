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


    const paintCanvas= document.createElement("canvas");
    if (!paintCanvas) 
        {
        paintCanvas = document.createElement("canvas");
        paintCanvas.id = "paintCanvas";
        paintCanvas.style.position = "absolute";
        paintCanvas.style.top = canvas.offsetTop + "px";
        paintCanvas.style.left = canvas.offsetLeft + "px";
        paintCanvas.style.zIndex = "10"; // Ensure it stays on top
        modal.appendChild(paintCanvas);
    }

    const paintCtx = paintCanvas.getContext("2d");
    paintCanvas.width=canvas.width;
    paintCanvas.height=canvas.height;
    //modal.appendChild(paintCanvas);


    modal.style.display = "flex";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let drawing = false;
    let erasing = false;
    let activeMode = null;
    //let originalImage = null;

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

        // draw orignal image on main canvas 
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
        //originalImage = ctx.getImageData(0,0,canvas.width,canvas.height);

        // make paint layer transparent
        //paintCtx.fillStyle = "rgba(0,0,0,0)";
        //paintCtx.fillRect(0,0,paintCanvas.width,paintCanvas.height);
        paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    };

    paintCtx.strokeStyle = "#FFF";
    paintCtx.lineWidth = 5;
    paintCtx.lineCap = "round";

  
    let toolCursor = document.createElement("img");
    toolCursor.classList.add("tool-cursor");
    toolCursor.style.position = "absolute";
    toolCursor.style.width = "40px";
    toolCursor.style.height = "40px";
    toolCursor.style.pointerEvents = "none";
    toolCursor.style.display = "none";
    toolCursor.style.zIndex = "1001";
    modal.appendChild(toolCursor);
    //document.body.appendChild(toolCursor);

    

    // Handle cursor movement (only inside image)
    canvas.addEventListener("mousemove", (e) => {
        // if (activeMode) {
        //     const rect = canvas.getBoundingClientRect();
        //     const x = e.clientX - rect.left;
        //     const y = e.clientY - rect.top;

        //     if (x >= imgX && x <= imgX + imgWidth && y >= imgY && y <= imgY + imgHeight) {
        //         toolCursor.style.display = "block";
        //         toolCursor.style.left = `${e.clientX - 15}px`;
        //         toolCursor.style.top = `${e.clientY - 15}px`;
        //     } else {
        //         toolCursor.style.display = "none";
        //     }
        //     if (drawing){
        //         paintCtx.lineTo(x,y);
        //         paintCtx.stroke();
        //         updateCanvas();

        //     }
        //     else{
        //         toolCursor.style.display="none";
        //     }
        // }

        // if (drawing && activeMode) {
        //     if (e.offsetX >= imgX && e.offsetX <= imgX + imgWidth &&
        //         e.offsetY >= imgY && e.offsetY <= imgY + imgHeight) {
        //         paintCtx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
        //         paintCtx.lineTo(e.offsetX, e.offsetY);
        //         paintCtx.stroke();

        //         // Draw the paint layer onto the main canvas
        //         ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
        //         ctx.drawImage(paintCanvas, 0,0);

        //     }
        // }
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x >= imgX && x <= imgX + imgWidth && y >= imgY && y <= imgY + imgHeight) {
            toolCursor.style.display = "block";
            toolCursor.style.left = `${e.clientX - 15}px`;
            toolCursor.style.top = `${e.clientY - 15}px`;

            if (drawing) {
                paintCtx.lineTo(x, y);
                paintCtx.stroke();
                updateCanvas();
            }
        } else {
            toolCursor.style.display = "none";
        }
      
    });

    function updateCanvas(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,imgX,imgY,imgWidth,imgHeight);
        ctx.drawImage(paintCanvas,0,0);

    
    }
    // Start drawing inside the image
    canvas.addEventListener("mousedown", (e) => {
        if (activeMode && e.offsetX >= imgX && e.offsetX <= imgX + imgWidth &&
            e.offsetY >= imgY && e.offsetY <= imgY + imgHeight) {
            drawing = true;
            paintCtx.beginPath();
            paintCtx.moveTo(e.offsetX, e.offsetY);
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
        paintCtx.globalCompositeOperation = "source-over";
        paintCtx.strokeStyle = "#FFF"; // White brush
        paintCtx.lineWidth = 5;
        toolCursor.src = "icons/paint.png"; // Brush icon
    });

    // Erase Mode (only erases white strokes, not background)
    document.getElementById("erase-mode").addEventListener("click", () => {
        activeMode = "erase";
        erasing = true;
        paintCtx.globalCompositeOperation = "destination-out";
        //ctx.strokeStyle = "rgba(122, 28, 28, 0)"; // Use black to erase white strokes only
        paintCtx.lineWidth = 20;
        toolCursor.src = "icons/eraser.png"; // Eraser icon
    });

    // Clear drawing 
    document.getElementById("clear-painting").addEventListener("click", () => {
        paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
        updateCanvas();
        //ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
        
    });

    // Close Painter
    document.getElementById("close-painter").addEventListener("click", () => {
        modal.style.display = "none";
        toolCursor.style.display = "none";
        drawing = false;
        erasing = false;
        activeMode = null;

    });

    //Save the edited image
    document.getElementById("save-painting").addEventListener("click", async () => {
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = imgWidth;
        finalCanvas.height = imgHeight;
        const finalCtx = finalCanvas.getContext("2d");

        // Draw orignal image 
        finalCtx.drawImage(img,0,0,imgWidth,imgHeight);

        // Draw the paint layer onto the final canvas
        finalCtx.drawImage(paintCanvas, 0, 0, imgWidth, imgHeight);

    

        finalCanvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("image", blob, "edited_painting.png");

            try {
                const response = await fetch("/upload/image", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const result = await response.json();
                    node.widgets[0].value = result.filename;
                    node.setProperty("image", result.filename);
                    alert(`Painting saved as ${result.filename} and updated!`);
                } else {
                    alert("Failed to save painting.");
                }
            } catch (error) {
                alert(`Error saving painting: ${error.message}`);
            }
        }, "image/png");

                

        modal.style.display = "none";
        toolCursor.style.display = "none";
        drawing = false;
        erasing = false;
        activeMode = null;


    });

}











