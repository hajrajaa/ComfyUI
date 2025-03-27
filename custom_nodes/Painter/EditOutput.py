import torch
import numpy as np
from PIL import Image
import folder_paths
import os

class EditOutput:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "paint_canvas": ("IMAGE",)
            },
        }

    RETURN_TYPES = ("IMAGE","IMAGE")
    RETURN_NAMES = ("image", "paint_canvas")
    FUNCTION = "save_and_return"
    OUTPUT_NODE = True
    CATEGORY = "custom"

    def __init__(self):
        self.output_dir = os.path.join(folder_paths.get_output_directory(), "edit_output")
        os.makedirs(self.output_dir, exist_ok=True)
            # 🔥 Clear previous images
        for filename in os.listdir(self.output_dir):
            file_path = os.path.join(self.output_dir, filename)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"⚠️ Failed to remove {file_path}: {e}")

       
        self.saved_filename = "paint_canvas.png"

    def save_tensor_image(self, tensor, name):
        """Save a tensor as a PNG file in the output directory."""
        img = 255.0 * tensor.cpu().numpy()
        pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
        path = os.path.join(self.output_dir, name)
        pil.save(path)
        print(f"✅ Saved: {path}")

    def tensor_from_path(self, path):
        img = Image.open(path).convert("RGB")
        img = np.array(img).astype(np.float32) / 255.0
        return torch.from_numpy(img).unsqueeze(0)
    
    def save_and_return(self, images, paint_canvas):
            image_path = os.path.join(self.output_dir, "image.png")
            paint_path = os.path.join(self.output_dir, self.saved_filename)

            # Always save the original image for display
            self.save_tensor_image(images[0], "image.png")

            # Check if the paint_canvas was edited and saved on disk
            if os.path.exists(paint_path) and os.path.getsize(paint_path) > 0:
                # Load and return the edited canvas
                try:
                    edited_tensor = self.tensor_from_path(paint_path)
                    return (images, edited_tensor)
                except Exception as e:
                    print(f"⚠️ Failed to load edited image, using original. Error: {e}")

            # If no edited version exists, save the current paint canvas as default
            self.save_tensor_image(paint_canvas[0], self.saved_filename)
            return (images, paint_canvas)
