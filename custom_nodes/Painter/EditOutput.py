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

    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("image", "paint_canvas")
    FUNCTION = "save_and_return"
    OUTPUT_NODE = True
    CATEGORY = "custom"

    def __init__(self):
        self.output_dir = os.path.join(folder_paths.get_output_directory(), "edit_output")
        os.makedirs(self.output_dir, exist_ok=True)

    def save_tensor_image(self, tensor, name):
        """Save a tensor as a PNG file in the output directory."""
        img = 255.0 * tensor.cpu().numpy()
        pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
        path = os.path.join(self.output_dir, name)
        pil.save(path)
        print(f"✅ Saved: {path}")

    def save_and_return(self, images, paint_canvas):
        self.save_tensor_image(images[0], "image.png")
        self.save_tensor_image(paint_canvas[0], "paint_canvas.png")
        return (images, paint_canvas)
