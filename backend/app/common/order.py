from rest_framework.exceptions import ValidationError


class OrderMixin:
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.validate_order()

    def validate_order(self):
        param = self.request.query_params.get("order")

        if param and param.startswith("-"):
            param = param[1:]

        if not param:
            return

        valid_fields = getattr(self, "ordering_fields", [])

        if param not in valid_fields:
            raise ValidationError("Ordem inválida.")
