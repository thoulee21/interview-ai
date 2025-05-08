import json

import numpy as np
from flask.json import JSONEncoder as FlaskJSONEncoder


class Float32FlaskEncoder(FlaskJSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.float32):
            return round(float(obj), 1)
        return super().default(obj)


class Float32JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.float32):
            return round(float(obj), 1)
        return super().default(obj)
