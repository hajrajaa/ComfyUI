from .PainterNode import PaintNode


WEB_DIRECTORY = "js"

NODE_CLASS_MAPPINGS = {
"PaintNode": PaintNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
"PaintNode": "Painter Node"
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
