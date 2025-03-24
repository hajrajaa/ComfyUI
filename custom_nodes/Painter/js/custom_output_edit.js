


import { app } from "../../scripts/app.js";



// Save original method
const originalGetNodeMenuOptions = LiteGraph.LGraphCanvas.prototype.getNodeMenuOptions;

LiteGraph.LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
    // Get original options
    let options = originalGetNodeMenuOptions ? originalGetNodeMenuOptions.call(this, node) : [];

    // Ensure options array exists
    options = options || [];

    // Add your custom option specifically for your node type
    if (node.type === "EditOutput") {
        // Add divider line if existing options aren't empty
        if (options.length > 0 && options[options.length - 1] !== null) {
            options.push(null);
        }

        options.push({
            content: "Open Output Editor",
            callback: () => openOutputEditor(node)
        });
    }

    return options;
};


function openOutputEditor(node) {

    

    const modal = document.getElementById("output-modal");
    const canvas = document.getElementById("output-canvas");
    const ctx = canvas.getContext("2d");




    modal.style.display = "flex";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;



    let zoomScale=1.0;
    let imgX, imgY, imgWidth, imgHeight;
    let centerX, centerY;



    const img = new Image();
    const nodeImageUrl = `/view?filename=${encodeURIComponent(node.widgets[0].value)}&type=input`;
    img.src = nodeImageUrl;

    let selecting = false;
    let mode = null;
    let startX, startY, currentX, currentY;
    let sourceRegion = null;
    let destinationRegion = null;

    const selectSourceBtn = document.getElementById("sourceBtn");
    const selectSourceArea = document.getElementById("select-region");
    const resetSourceArea = document.getElementById("reset-selection");

    const selectDestBtn = document.getElementById("destBtn");
    const selectDestArea = document.getElementById("select-destination-region");
    const resetDestArea = document.getElementById("reset-destination");


    const resetAllBtn=document.getElementById("ResetAllBtn");
    

    selectRegionSetup();
 
    img.onload = () => {


        resetImagePostions();
        updateCanvas();
    };

    function resetImagePostions(){
        const aspectRatio = img.width / img.height;
        if (canvas.width / aspectRatio <= canvas.height) {
            imgWidth = canvas.width * 0.8;
            imgHeight = imgWidth / aspectRatio;
        } else {
            imgHeight = canvas.height * 0.8;
            imgWidth = imgHeight * aspectRatio;
        }

   
        centerX=canvas.width/2;
        centerY=canvas.height/2;
        zoomScale=1.0;
        imgX=centerX-imgWidth/2;
        imgY=centerY-imgHeight/2;
    
        updateCanvas();
    }

    function updateCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);

        ctx.lineWidth = 2 / zoomScale;

        if (sourceRegion) {
            drawBox(sourceRegion, "#00FF00");
        }

        if (destinationRegion) {
            drawBox(destinationRegion, "red");
        }

        if (selecting && currentX && currentY) {
            const rect = getRect(startX, startY, currentX, currentY);
            drawDashedBox(rect, "#FFFFFF");
        }

        ctx.restore();
    }

    function drawBox(rect, color) {
        ctx.strokeStyle = color;
        ctx.setLineDash([]);
        ctx.strokeRect(
            rect.x * zoomScale + imgX,
            rect.y * zoomScale + imgY,
            rect.width * zoomScale,
            rect.height * zoomScale
        );
    }

    function drawDashedBox(rect, color) {
        ctx.strokeStyle = color;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([]);
    }





    // Zoom in and out handler (mouse wheel)
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomFactor=1.1;
        const scale = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

        zoomScale *= scale;
        updateCanvas();
    });

    // zoom handler (keyboard shortcuts)
    window.addEventListener("keydown", (e) => {
        if (e.key === "+" || e.key === "=") {   
            zoomScale *= 1.1;
        }
        if (e.key === "-") {
            zoomScale /= 1.1;
        }
        updateCanvas();
    });

    canvas.addEventListener("mousedown", (e) => {
        if (!selecting) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x >= imgX && x <= imgX + imgWidth && y >= imgY && y <= imgY + imgHeight) {
            startX = x;
            startY = y;
            currentX = x;
            currentY = y;
        } else {
            selecting = false;
        }
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!selecting) return;
        const rect = canvas.getBoundingClientRect();
        currentX = e.clientX - rect.left;
        currentY = e.clientY - rect.top;
        updateCanvas();
    });

    canvas.addEventListener("mouseup", (e) => {
        if (!selecting) return;
        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const sel = getRect(startX, startY, endX, endY);

        const imageX = (sel.x - imgX) / zoomScale;
        const imageY = (sel.y - imgY) / zoomScale;

        const region = {
            x: imageX,
            y: imageY,
            width: sel.width / zoomScale,
            height: sel.height / zoomScale
        };

        if (mode === "source") {
            sourceRegion = region;
            selectDestBtn.disabled = false;
        } else if (mode === "destination") {
            destinationRegion = region;
        }

        selecting = false;
        canvas.style.cursor = "default";
        updateCanvas();
    });

    document.getElementById("ResetAllBtn").addEventListener("click", () => {
        

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Reset all state
        selecting = false;
        mode = null;
        sourceRegion = null;
        destinationRegion = null;
    
        // Reset coordinates
        startX = undefined;
        startY = undefined;
        currentX = undefined;
        currentY = undefined;
    
        // Reset UI visibility
        selectSourceArea.style.display = "none";
        resetSourceArea.style.display = "none";
        selectDestArea.style.display = "none";
        resetDestArea.style.display = "none";
    
        // Re-enable and disable buttons properly
        selectSourceBtn.disabled = false;
        selectDestBtn.disabled = true;
    
        updateCanvas();
    });

    function getRect(x1, y1, x2, y2) {
        return {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
        };
    }

    function selectRegionSetup() {
        selectSourceBtn.addEventListener("click", () => {
            mode = "source";
            selecting = false;
            selectSourceArea.style.display = "inline-block";
            resetSourceArea.style.display = "inline-block";
            selectDestBtn.disabled = true;
            selectDestArea.style.display = "none";
            resetDestArea.style.display = "none";
        });

        selectDestBtn.addEventListener("click", () => {
            mode = "destination";
            selecting = false;
            startX = undefined;
            startY = undefined;
            currentX = undefined;
            currentY = undefined;
            selectDestArea.style.display = "inline-block";
            resetDestArea.style.display = "inline-block";
            selectSourceBtn.disabled = true;
            selectSourceArea.style.display = "none";
            resetSourceArea.style.display = "none";
        });

        selectSourceArea.addEventListener("click", () => {
            selecting = true;
            canvas.style.cursor = "crosshair";

        });

        resetSourceArea.addEventListener("click", () => {
            sourceRegion = null;
            
            selectDestBtn.disabled = true;
            
            selecting = false;
            startX = undefined;
            startY = undefined;
            currentX = undefined;
            currentY = undefined;

            updateCanvas();

        });

        selectDestArea.addEventListener("click", () => {
            selecting = true;
            canvas.style.cursor = "crosshair";
        });

        resetDestArea.addEventListener("click", () => {
            destinationRegion = null;
            selecting = false;
            startX = undefined;
            startY = undefined;
            currentX = undefined;
            currentY = undefined;

            updateCanvas();
        });
    }

    document.getElementById("close-output-editor").addEventListener("click", () => {
        modal.style.display = "none";

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Reset all state
        selecting = false;
        mode = null;
        sourceRegion = null;
        destinationRegion = null;
    
        // Reset coordinates
        startX = undefined;
        startY = undefined;
        currentX = undefined;
        currentY = undefined;
    
        // Reset UI visibility
        selectSourceArea.style.display = "none";
        resetSourceArea.style.display = "none";
        selectDestArea.style.display = "none";
        resetDestArea.style.display = "none";
    
        // Re-enable and disable buttons properly
        selectSourceBtn.disabled = false;
        selectDestBtn.disabled = true;
    
        updateCanvas();
    });

    

}













