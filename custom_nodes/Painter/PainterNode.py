import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence
import folder_paths
import hashlib
import os
import node_helpers
import base64
from io import BytesIO
import re
import os 
import time
import base64

def tensor_to_base64(tensor):
    np_img = (tensor.squeeze(0).permute(1, 2, 0).clamp(0, 1).numpy() * 255).astype(np.uint8)
    img = Image.fromarray(np_img)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")

class PaintNode:
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
        return {"required":
                    {"image": (sorted(files), {"image_upload": True})},
                }

    CATEGORY = "custom"

    RETURN_TYPES = ("IMAGE","IMAGE")
    RETURN_NAMES=("image","paint_canvas")
    FUNCTION = "load_image"

    OUTPUT_NODE=True

    def load_image(self, image):
        image_path = folder_paths.get_annotated_filepath(image)

        img = node_helpers.pillow(Image.open, image_path)

        output_images = []
        output_masks = []
        w, h = None, None

        excluded_formats = ['MPO']

        for i in ImageSequence.Iterator(img):
            i = node_helpers.pillow(ImageOps.exif_transpose, i)

            if i.mode == 'I':
                i = i.point(lambda i: i * (1 / 255))
            image = i.convert("RGB")

            if len(output_images) == 0:
                w = image.size[0]
                h = image.size[1]

            if image.size[0] != w or image.size[1] != h:
                continue

            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]
            if 'A' in i.getbands():
                mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
                mask = 1. - torch.from_numpy(mask)
            else:
                mask = torch.zeros((64,64), dtype=torch.float32, device="cpu")
            output_images.append(image)
            output_masks.append(mask.unsqueeze(0))

        if len(output_images) > 1 and img.format not in excluded_formats:
            output_image = torch.cat(output_images, dim=0)
            output_mask = torch.cat(output_masks, dim=0)
        else:
            output_image = output_images[0]
            output_mask = output_masks[0]

         
        base_name, _ = os.path.splitext(os.path.basename(image_path))
        painted_image_path = os.path.join(folder_paths.get_input_directory(), f"{base_name}.png")
        canvas_base = base_name.replace("image", "canvas")
        paint_canvas_path = os.path.join(folder_paths.get_input_directory(), f"{canvas_base}.png")

        print(painted_image_path)
        print(paint_canvas_path)

        # # Load merged image if exists
        # if os.path.exists(painted_image_path):
        #     merged_img = Image.open(painted_image_path).convert("RGB")
        #     merged_tensor = torch.from_numpy(np.array(merged_img).astype(np.float32) / 255.0).unsqueeze(0)
        # else:
        #     merged_tensor = output_image  # fallback to original image
        try:
            merged_img = Image.open(painted_image_path).convert("RGB")
            merged_tensor = torch.from_numpy(np.array(merged_img).astype(np.float32) / 255.0).unsqueeze(0)
            print("Successfully loaded painted image.")
        except FileNotFoundError:
            print("Painted image not found:", painted_image_path)
            merged_tensor = output_image  # fallback to original image


        # # Load paint canvas if exists
        # if os.path.exists(paint_canvas_path):
        #     paint_img = Image.open(paint_canvas_path).convert("RGB")
        #     paint_tensor = torch.from_numpy(np.array(paint_img).astype(np.float32) / 255.0).unsqueeze(0)
        # else:
        #     paint_tensor = torch.zeros_like(output_image)

        try:
            paint_img = Image.open(paint_canvas_path).convert("RGB")
            paint_tensor = torch.from_numpy(np.array(paint_img).astype(np.float32) / 255.0).unsqueeze(0)
            print("Successfully loaded paint canvas.")
        except FileNotFoundError:
            print("Paint canvas not found:", paint_canvas_path)
            paint_tensor = torch.zeros_like(output_image)





        return (merged_tensor, paint_tensor)


    @classmethod
    def IS_CHANGED(s, image):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, 'rb') as f:
            m.update(f.read())
        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(s, image):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)

        return True
