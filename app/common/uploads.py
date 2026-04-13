import os
import uuid

from django.utils.deconstruct import deconstructible


@deconstructible
class UploadsPath:
    def __init__(self, sub_path):
        self.path = sub_path

    def __call__(self, instance, filename):
        extension = filename.split(".")[-1].lower()
        filename = "%s.%s" % (uuid.uuid4(), extension)
        return os.path.join(self.path, filename)
