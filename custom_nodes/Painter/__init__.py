from .PainterNode import PaintNode
from .EditOutput import EditOutput


WEB_DIRECTORY = "js"

NODE_CLASS_MAPPINGS = {
"PaintNode": PaintNode,
"EditOutput": EditOutput
}

NODE_DISPLAY_NAME_MAPPINGS = {
"PaintNode": "Painter Node",
"EditOutput": "Edit Output Node"
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
