import torch


class ImageRegionReplacer:

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
       
        return {
           "required":{ 
            "image":   ("IMAGE",{}), # THE LOADED IMAGE TENSOR
            # Coordinates of the source region 
            "source_area_x":("INT",{"default" : 0 , "min":0 , "tooltip":"X coordinate of the source region"}),
            "source_area_y":("INT",{"default" : 0 , "min":0 , "tooltip":"Y coordinate of the source region"}),
            "source_area_width":("INT",{"default" : 256 , "min":1 , "tooltip":"Width of the source region"}),
            "source_area_height":("INT",{"default" : 256 , "min":1 , "tooltip":"Height of the source region"}),
            # Coordinates of the destination region
            "destination_area_x":("INT",{"default" : 0 , "min":0 , "tooltip":"X coordinate of the destination region"}),
            "destination_area_y":("INT",{"default" : 0 , "min":0 , "tooltip":"Y coordinate of the destination region"}),
            # Optional blending to smooth the region edges
            "blend_pixels":("FLOAT",{"default" : 16.0 , "min":0.0 , "max":32.0 , "tooltip":"Number of pixels to blend the edges of the region"}),
            "rescale_algorithm":("STRING",{"default" : "BILINEAR" , "options":["BILINEAR","NEAREST","BICUBIC"], "tooltip":"Rescale algorithm to use if needed"}),}
        }

    RETURN_TYPES = ("IMAGE","MASK")
    #RETURN_NAMES = ("image_output_name",)

    FUNCTION = "replace_region"

    #OUTPUT_NODE = False

    CATEGORY = "newwww"

    def replace_region(
            self,
            image,
            source_area_x,
            source_area_y,
            source_area_width,
            source_area_height,
            destination_area_x,
            destination_area_y,
            blend_pixels,
            rescale_algorithm
        ):
        img=image[0]
        H,W,C=img.shape

        # Ensure the source region is within the image bounds
        source_area_x = max(0, min(source_area_x, W-1))
        source_area_y = max(0, min(source_area_y, H-1))
        source_area_width = max(1, min(source_area_width, W-source_area_x))
        source_area_height = max(1, min(source_area_height, H-source_area_y))

        #EXTRACT THE SOURCE REGION
        source_region = img[source_area_y:source_area_y+source_area_height, source_area_x:source_area_x+source_area_width,:].clone()

        # we clear the source area in the original image by setting it to a mid-gray value
        # check if we need to use inpainting to fill the source region !!!!!!!!!!!!!!!
        out_img = image.clone()
        out_img[0, source_area_y:source_area_y+source_area_height, source_area_x:source_area_x+source_area_width,:] = 0.5

        # determine the destination  coordinates ensuring it is within the image bounds.
        destination_area_x = max(0, min(destination_area_x, W-source_area_width))
        destination_area_y = max(0, min(destination_area_y, H-source_area_height))


        # paste the source region into the destination region
        # optionally blend the edges of the source region
        if blend_pixels > 0.0:

            # create a simple linear blend mask that ramps from 0.0 to 1.0 over the blend region
            bp=int(round(blend_pixels))
            blend_mask = torch.ones((source_area_height, source_area_width), dtype=torch.float32)
            if bp >0:
                # TOP AND BOTTOM GRADIENTS
                for i in range(bp):
                    blend_mask[i,:] = i/bp
                    blend_mask[-(i+1),:] = i/bp

                # LEFT AND RIGHT GRADIENTS
                for j in range(bp):
                    blend_mask[:,j] = torch.min(blend_mask[:,j], torch.tensor(j/bp))
                    blend_mask[:,-(j+1)] = torch.min(blend_mask[:,-(j+1)], torch.tensor(j/bp))

            # Expand the  blend mask to match the region's channels
            blend_mask= blend_mask.unsqueeze(-1).expand_as(source_region)

            # extract the destination region from the output image
            destination_region = out_img[0, destination_area_y:destination_area_y+source_area_height, destination_area_x:destination_area_x+source_area_width,:]

            composited_region = source_region * blend_mask + destination_region * (1.0 - blend_mask)

            out_img[0, destination_area_y:destination_area_y+source_area_height, destination_area_x:destination_area_x+source_area_width,:] = composited_region

        else:
            out_img[0, destination_area_y:destination_area_y+source_area_height, destination_area_x:destination_area_x+source_area_width,:] = source_region


        #Create an output mask to indicate the replaced region
        mask = torch.zeros((1,H,W), dtype=torch.float32)
        mask[0,destination_area_y:destination_area_y+source_area_height, destination_area_x:destination_area_x+source_area_width] = 1.0


        return (out_img, mask)
    

                    








    


    # A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = {
    "ImageRegionReplacer": ImageRegionReplacer
}

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageRegionReplacer": "ImageRegionReplacer Node"
}



