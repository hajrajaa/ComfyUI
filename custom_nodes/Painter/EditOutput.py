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


class EditOutput:

    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
        return {"required":
                    {"image": (sorted(files), {"image_upload": True}),
                     "paint_canvas":(sorted(files), {"image_upload": True}),
                     "action":(["save","close"],),
                     },
                }

    RETURN_TYPES = ("IMAGE","PAINT_CANVAS")
    FUNCTION = "load_image"
    CATEGORY = "custom"
    
    def load_image(self, image,paint_canvas,action):
        image_path = folder_paths.get_annotated_filepath(image)

        img = node_helpers.pillow(Image.open, image_path)
        img=node_helpers.pillow(ImageOps.exif_transpose, img)
        edited_image = np.array(img.convert("RGB")).astype(np.float32) / 255.0
        edited_image = torch.from_numpy(edited_image)[None,]
        
        if action=="save":
            paint_path=folder_paths.get_annotated_filepath(paint_canvas)
            paint=node_helpers.pillow(Image.open, paint_path)
            paint=node_helpers.pillow(ImageOps.exif_transpose, paint)
            paint_canvas_image= torch.from_numpy(np.array(paint).astype(np.float32) / 255.0)[None,]

        elif action=="close":
            if paint_canvas and folder_paths.exists_annotated_filepath(paint_canvas):

                # return previous paint canvas (unchanged)
                paint_path=folder_paths.get_annotated_filepath(paint_canvas)
                paint=node_helpers.pillow(Image.open, paint_path)
                paint=node_helpers.pillow(ImageOps.exif_transpose, paint)
                paint_canvas_image= torch.from_numpy(np.array(paint).astype(np.float32) / 255.0)[None,]
            else:
                paint_canvas_image= torch.zeros_like(edited_image)
        return (edited_image, paint_canvas_image)


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