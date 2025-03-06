import torch 
import numpy as np
from custom_nodes import nodes



class ImageDeformationNode:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "imgae": ("IMAGE",),
                "deformation_strength": ("FLOAT", {"default": 0.5 ,"min":0.0 , "max": 1.0 ,"step": 0.01}),
                "deformation type": (["warp","twist","wave"] , {"default": "warp"}),

            }
       }
    

    CATEGORY= "Deformation"
    RETURN_TYPES=("IMAGE",)
    RETURN_NAMES=("deformed_image",)
    FUNCTION="deform_image"


    def deform_image(self, image , deformation_strength , deformation_type):

        image=image.squeeze(0).permute(1,2,0).cpu().numpy()

        if deformation_type=="warp":

            coords=np.indices(image.shape[:2]).astype(np.float32)
            coords[0]+=deformation_strength* np.sin(coords[1]/20)
            coords[1]+=deformation_strength* np.cos(coords[0]/20)
            deformed_image=np.clip(image, 0 , 255)

        elif deformation_type=="twist":
            
            center=np.array(image.shape[:2])//2
            coords=np.indices(image.shape[:2])-center[:,None,None]
            angle=np.arctan2(coords[0],coords[1])+ deformation_strength
            radius=np.sqrt(coords[0]**2 + coords[1]**2)
            coords=(radius * np.sin(angle) , radius* np.cos(angle))
            deformed_image=np.clip(image, 0 , 255)

        elif deformation_type=="wave":

            coords=np.indices(image.shape[:2]).astype(np.float32)
            coords[0]+=deformation_strength* np.sin(coords[1]/10)
            deformed_image=np.clip(image, 0 , 255)

        deformed_image=torch.from_numpy(deformed_image).permute(2,0,1).unsqueeze(0)

        return (deformed_image,)
    




