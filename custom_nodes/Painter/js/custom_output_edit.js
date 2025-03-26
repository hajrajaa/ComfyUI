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
    const displayCanvas = document.getElementById("output-canvas");
    const closeBtn = document.getElementById("close-output-editor");
    const resetBtn = document.getElementById("ResetAllBtn");
    const selectSourceBtn = document.getElementById("sourceBtn");
    const resetSourceArea = document.getElementById("reset-selection");
    const selectSourceArea=document.getElementById("select-region");
    
    const selectDestBtn=document.getElementById("destBtn");
    const selectDestArea=document.getElementById("select-destination-region");
    const resetDestArea=document.getElementById("reset-destination");
    const displayCtx = displayCanvas.getContext("2d");

    modal.style.display="flex";
    displayCanvas.width=window.innerWidth;
    displayCanvas.height=window.innerHeight;
    

    const img = new Image();
    const paintCanvasImg = new Image();
    const imgCanvas=document.createElement("canvas");
    const imgCtx=imgCanvas.getContext("2d");
    const paintCanvas=document.createElement("canvas");
    const paintCtx=paintCanvas.getContext("2d");
    const compositeCanvas=document.createElement("canvas");
    const compositeCtx=compositeCanvas.getContext("2d");

    // LOAD IMAGES 
    let imagesLoaded=0;
    function checkImagesLoaded(){
        imagesLoaded++;
        if(imagesLoaded===2) initializeEditor();
    }

    img.onload= function(){
        imgCanvas.width=img.width;
        imgCanvas.height=img.height;
        imgCtx.drawImage(img,0,0);
        checkImagesLoaded();
    };
    img.onerror = () => console.error("Failed to load image");

    paintCanvasImg.onload = function() {
        paintCanvas.width = paintCanvasImg.width;
        paintCanvas.height = paintCanvasImg.height;
        compositeCanvas.width = paintCanvasImg.width;
        compositeCanvas.height = paintCanvasImg.height;
        paintCtx.drawImage(paintCanvasImg, 0, 0);
        checkImagesLoaded();
    };
    paintCanvasImg.onerror = () => console.error("Failed to load paint canvas");

    
    const nodeImageUrl = `/view?filename=${encodeURIComponent(node.widgets[0].value)}&type=input`;
    img.src = nodeImageUrl;

    
    
    const paintCanvasUrl = `/view?filename=${encodeURIComponent(node.widgets[1].value)}&type=input`;
    paintCanvasImg.src = paintCanvasUrl;

 
    
    let selecting = false;
    let selectedPolygon = null;
    let lassoPath = [];
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let tempPolygon = null; // For showing drag preview
    let mode=null;
    let isDrawing=false;

    
   
  
    function initializeEditor(){
        // Clear previous event listeners
        displayCanvas.removeEventListener("mousedown", onMouseDown);
        displayCanvas.removeEventListener("mousemove", onMouseMove);
        displayCanvas.removeEventListener("mouseup", onMouseUp);
        

        // Add new event listeners
        displayCanvas.addEventListener("mousedown", onMouseDown);
        displayCanvas.addEventListener("mousemove", onMouseMove);
        displayCanvas.addEventListener("mouseup", onMouseUp);

        // Add event listeners for buttons

        selectSourceBtn.addEventListener("click", () => {
            mode = "source";
            selecting = false;
            selectSourceArea.style.display = "inline-block";
            resetSourceArea.style.display = "inline-block";
            selectDestBtn.disabled = true;
            selectDestArea.style.display = "none";
            resetDestArea.style.display = "none";
           
        });
        

        selectSourceArea.onclick=()=>{
            //mode="source";
            selecting= true;
            lassoPath=[];
            selectedPolygon=null;
            tempPolygon=null;
            isDragging=false;
            isDrawing=false;
            displayCanvas.style.cursor="crosshair";
            updateDisplay();
        };

        selectDestBtn.addEventListener("click", () => {
            mode = "dest";
            isDragging = false;
            isDrawing=false;
            selectDestArea.style.display = "inline-block";
            resetDestArea.style.display = "inline-block";
            //selectDestArea.disabled = true;
            selectSourceArea.style.display = "none";
            resetSourceArea.style.display = "none";
        });

        selectDestArea.onclick=()=>{
            isDrawing=false;
            if (selectedPolygon){
                mode="dest";
                displayCanvas.style.cursor="move";
                
            }
            else{
                alert("Please select a source region first");
            }
        };

        resetSourceArea.addEventListener("click", () => {
            selectDestBtn.disabled = true;
            selecting = false;
            selectedPolygon = null;
            lassoPath = [];
            isDragging = false;
            isDrawing = false;
            mode = null;
            displayCanvas.style.cursor = "default";
        
            // // Hide source UI
            // selectSourceArea.style.display = "none";
            // resetSourceArea.style.display = "none";
        
            // Also hide dest UI just in case
            selectDestArea.style.display = "none";
            resetDestArea.style.display = "none";
        
            updateDisplay();
        });

        resetDestArea.addEventListener("click", () => {
            isDragging = false;
            isDrawing = false;
            tempPolygon = null;
            mode = null;
            displayCanvas.style.cursor = "default";
        
            // Hide destination UI
            selectDestArea.style.display = "none";
            resetDestArea.style.display = "none";
        
            updateDisplay();
        });
        

        updateDisplay();
    }
    
    function updateDisplay() {
        // Clear display
        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

        // Calculate scale and offset to center the image
        const scale = Math.min(
            displayCanvas.width / imgCanvas.width,
            displayCanvas.height / imgCanvas.height
        );
        const drawWidth = imgCanvas.width * scale;
        const drawHeight = imgCanvas.height * scale;
        const offsetX = (displayCanvas.width - drawWidth) / 2;
        const offsetY = (displayCanvas.height - drawHeight) / 2;

        // Draw the original image
        displayCtx.drawImage(
            imgCanvas, 
            0, 0, imgCanvas.width, imgCanvas.height,
            offsetX, offsetY, drawWidth, drawHeight
        );

        // Draw the paint layer (semi-transparent)
        displayCtx.globalAlpha = 0.7;
        displayCtx.drawImage(
            paintCanvas,
            0, 0, paintCanvas.width, paintCanvas.height,
            offsetX, offsetY, drawWidth, drawHeight
        );
        displayCtx.globalAlpha = 1.0;

        if (mode === "source" && lassoPath.length > 0 && isDrawing) {

        
            displayCtx.strokeStyle = "#AAAAAA";
            displayCtx.setLineDash([5, 5]);
            displayCtx.lineWidth = 2;
            displayCtx.beginPath();
            displayCtx.moveTo(lassoPath[0].x, lassoPath[0].y);
            for (let i = 1; i < lassoPath.length; i++) displayCtx.lineTo(lassoPath[i].x, lassoPath[i].y);
            if (isDrawing)
            {
                const mousePos=lassoPath[lassoPath.length-1];
                displayCtx.lineTo(mousePos.x,mousePos.y);
            }
            displayCtx.stroke();
            displayCtx.setLineDash([]);
        }

        // Draw selected polygon 
        if (selectedPolygon && !isDragging && !isDrawing) {
            drawPolygon(selectedPolygon, "#00FF00");
        }

        // Draw temporary polygon during drag 
        if (tempPolygon) {
            drawPolygon(tempPolygon, "#FFFF00");
        }
        
        
        
    }
    function drawPolygon(polygon, color) {
        const scale = Math.min(
            displayCanvas.width / imgCanvas.width,
            displayCanvas.height / imgCanvas.height
        );
        const offsetX = (displayCanvas.width - imgCanvas.width * scale) / 2;
        const offsetY = (displayCanvas.height - imgCanvas.height * scale) / 2;

        displayCtx.strokeStyle = color;
        displayCtx.lineWidth = 2;
        displayCtx.beginPath();
        
        // Convert image coordinates to display coordinates
        const firstPoint = polygon[0];
        displayCtx.moveTo(
            firstPoint.x * scale + offsetX,
            firstPoint.y * scale + offsetY
        );
        
        for (let i = 1; i < polygon.length; i++) {
            displayCtx.lineTo(
                polygon[i].x * scale + offsetX,
                polygon[i].y * scale + offsetY
            );
        }
        
        displayCtx.closePath();
        displayCtx.stroke();
    }

    
    function getCanvasCoordinates(e) {
        const rect = displayCanvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function getImageCoordinates(displayX, displayY) {
        const scale = Math.min(
            displayCanvas.width / imgCanvas.width,
            displayCanvas.height / imgCanvas.height
        );
        const offsetX = (displayCanvas.width - imgCanvas.width * scale) / 2;
        const offsetY = (displayCanvas.height - imgCanvas.height * scale) / 2;
        
        return {
            x: (displayX - offsetX) / scale,
            y: (displayY - offsetY) / scale
        };
    }

    function getPolygonBounds(polygon) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of polygon) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }


    function onMouseDown(e) {
        const coords = getCanvasCoordinates(e);
        const imgCoords = getImageCoordinates(coords.x, coords.y);

        if (mode === "dest" && selectedPolygon) {
            isDragging = true;
            tempPolygon = selectedPolygon.map(p => ({ ...p }));
            const bounds = getPolygonBounds(selectedPolygon);
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            dragOffset = { x: imgCoords.x - centerX, y: imgCoords.y - centerY };
            displayCanvas.style.cursor = "grabbing";
        }

        if (mode === "source") {
            isDrawing=true;
            lassoPath=[coords];
            //lassoPath.push(coords);
        }
    }

    function onMouseMove(e) {
        const coords = getCanvasCoordinates(e);
        const imgCoords = getImageCoordinates(coords.x, coords.y);

        if (isDragging && mode === "dest" && tempPolygon) {
            const bounds = getPolygonBounds(selectedPolygon);
            const targetX = imgCoords.x - dragOffset.x - bounds.width / 2;
            const targetY = imgCoords.y - dragOffset.y - bounds.height / 2;
            
            // Calculate the translation needed
            const dx = targetX - bounds.x;
            const dy = targetY - bounds.y;
            
            // Update temp polygon position
            tempPolygon = selectedPolygon.map(p => ({
                x: p.x + dx,
                y: p.y + dy
            }));
            
            updateDisplay();
        }

        if ( mode === "source" && isDrawing) {
            lassoPath.push(coords);
            updateDisplay();
        }
    }

    
    function onMouseUp(e) {
        if (isDragging && tempPolygon && mode === "dest") {
            isDragging = false;
            
            // Extract the region from original position
            const region = extractPolygonFromCanvas(paintCanvas, selectedPolygon);
            
            // Erase from original position
            erasePolygonFromCanvas(paintCanvas, selectedPolygon);
            
            // Calculate the translation
            const oldBounds = getPolygonBounds(selectedPolygon);
            const newBounds = getPolygonBounds(tempPolygon);
            const dx = newBounds.x - oldBounds.x;
            const dy = newBounds.y - oldBounds.y;
            
            // Paste to new position
            pasteRegionOnCanvas(paintCanvas, region, newBounds.x, newBounds.y);
            
            // Update the selected polygon to new position
            selectedPolygon = tempPolygon;
            tempPolygon = null;
            
            displayCanvas.style.cursor = "move";
            updateDisplay();
        }
        

        if (mode === "source" && isDrawing) {
            isDrawing = false;
            
            // Close the polygon if it has enough points
            if (lassoPath.length > 2) {
                // Convert display coordinates to image coordinates
                selectedPolygon = lassoPath.map(p => getImageCoordinates(p.x, p.y));
                
                // Make sure the polygon is closed
                const firstPoint = selectedPolygon[0];
                selectedPolygon.push({ x: firstPoint.x, y: firstPoint.y });

                selectDestBtn.disabled = false;
            }
            
            //lassoPath = [];
            updateDisplay();
        }
    }



    function extractPolygonFromCanvas(canvas, polygon) {
        const bounds = getPolygonBounds(polygon);
        const clipCanvas = document.createElement("canvas");
        const clipCtx = clipCanvas.getContext("2d");
        clipCanvas.width = bounds.width;
        clipCanvas.height = bounds.height;

        clipCtx.save();
        clipCtx.translate(-bounds.x, -bounds.y);
        clipCtx.beginPath();
        clipCtx.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) clipCtx.lineTo(polygon[i].x, polygon[i].y);
        clipCtx.closePath();
        clipCtx.clip();
        clipCtx.drawImage(canvas, 0, 0);
        clipCtx.restore();

        return { canvas: clipCanvas, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    }

    function erasePolygonFromCanvas(canvas, polygon) {
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);
        ctx.closePath();
        ctx.clip();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    function pasteRegionOnCanvas(canvas, region, x, y) {
        const ctx = canvas.getContext("2d");
        ctx.drawImage(region.canvas, 0, 0, region.width, region.height, x, y, region.width, region.height);
    }

    // Event listeners for buttons
    resetBtn.onclick = function() {
        selecting = false;
        selectedPolygon = null;
        lassoPath = [];
        isDragging = false;
        mode = null;
        displayCanvas.style.cursor = "default";
        updateDisplay();
    };

    closeBtn.onclick = function() {
        // Clean up
        displayCanvas.removeEventListener("mousedown", onMouseDown);
        displayCanvas.removeEventListener("mousemove", onMouseMove);
        displayCanvas.removeEventListener("mouseup", onMouseUp);
        
        modal.style.display = "none";
        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        selectSourceArea.style.display = "none";
        selectDestArea.style.display = "none";
        selectSourceBtn.disabled = false;
        selectDestBtn.disabled=true;
    };

    document.getElementById("save-output").addEventListener("click", async () => {

        
            if (!selectedPolygon) {
                alert("No changes to save");
                return;
            }

            try {

                // Create a copy of the paint canvas
                const finalCanvas = document.createElement("canvas");
                finalCanvas.width = paintCanvas.width;
                finalCanvas.height = paintCanvas.height;
                const finalCtx = finalCanvas.getContext("2d");
                
                // Draw the current paint canvas
                finalCtx.drawImage(paintCanvas, 0, 0);
                
                // Fill the original position with black
                finalCtx.save();
                finalCtx.beginPath();
                finalCtx.moveTo(selectedPolygon[0].x, selectedPolygon[0].y);
                for (let i = 1; i < selectedPolygon.length; i++) {
                    finalCtx.lineTo(selectedPolygon[i].x, selectedPolygon[i].y);
                }
                finalCtx.closePath();
                finalCtx.clip();
                finalCtx.fillStyle = "black";
                finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                finalCtx.restore();

                
                
                // Convert canvas to blob
                finalCanvas.toBlob(async (blob) => {
                    try {
                        // Create FormData and append the image
                        const formData = new FormData();
                        const filename = originalNode.widgets[1].value;
                        formData.append("image", blob, filename);
                        
                        // Send to server
                        const response = await fetch("/upload/image", {
                            method: "POST",
                            body: formData
                        });
                        
                        if (response.ok) {
                            alert("Image saved successfully");
                            // Refresh the paint canvas to show changes
                            paintCanvasImg.src = `${paintCanvasUrl}&t=${Date.now()}`;
                        } else {
                            throw new Error("Failed to save image");
                        }
                    } catch (error) {
                        console.error("Save error:", error);
                        alert("Failed to save image");
                    }
                }, "image/png");
            } catch (error) {
                console.error("Save error:", error);
                alert("Failed to save image");
            }
        

        updateDisplay();
  



    });














    

}







