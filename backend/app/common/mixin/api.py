import json

import requests
from django.core.exceptions import ValidationError


class CreateMixin:
    BASE_ENDPOINT = None

    def __init__(self, connector):
        self.connector = connector

    def create(self, payload):
        try:
            response = self.connector.post(self.BASE_ENDPOINT, payload)
            status = response.status_code
        except ValidationError as e:
            raise ValidationError(e)
        return response.json(), status


class RetrieveMixin:
    BASE_ENDPOINT = None

    def __init__(self, connector):
        self.connector = connector

    def retrieve(self, reference):
        try:
            response = self.connector.get(f'{self.BASE_ENDPOINT}/{reference}', None)
            status = response.status_code
        except ValidationError as e:
            raise ValidationError(e)
        return response.json(), status


class UpdateMixin:
    BASE_ENDPOINT = None

    def __init__(self, connector):
        self.connector = connector

    def update(self, reference, payload):
        try:
            response = self.connector.put(f'{self.BASE_ENDPOINT}/{reference}', payload)
            status = response.status_code
        except ValidationError as e:
            raise ValidationError(e)

        return response.json(), status


class ListMixin:
    BASE_ENDPOINT = None

    def __init__(self, connector):
        self.connector = connector

    def list(self, query_params=None):
        try:
            response = self.connector.get(self.BASE_ENDPOINT, query_params=query_params)
            status = response.status_code
        except ValidationError as e:
            raise ValidationError(e)
        return response.json(), status


class DeleteMixin:
    BASE_ENDPOINT = None

    def __init__(self, connector):
        self.connector = connector

    def delete(self, reference):
        try:
            response = self.connector.delete(f'{self.BASE_ENDPOINT}/{reference}', None)
            status = response.status_code
        except ValidationError as e:
            raise ValidationError(e)
        return response.json(), status


class Connector:
    def __init__(self, source, base_url='', auth=None):
        self.api_root = base_url
        self.auth = auth
        self.source = source
        self.headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'}

    def post(self, endpoint, data):
        url = self.api_root + endpoint

        try:
            return requests.post(url, json=data, headers=self.headers, auth=self.auth)
        except Exception as e:
            raise ValidationError(e)

    def get(self, endpoint, query_params):
        url = self.api_root + endpoint
        try:
            return requests.get(url, params=query_params, auth=self.auth)
        except Exception as e:
            raise ValidationError(e)

    def put(self, endpoint, data):
        url = self.api_root + endpoint

        try:
            return requests.put(url, json=data, auth=self.auth)
        except Exception as e:
            raise ValidationError(e)

    def delete(self, endpoint, data):
        url = self.api_root + endpoint
        try:
            return requests.delete(url, data=json.dumps(data), auth=self.auth)
        except Exception as e:
            raise ValidationError(e)

    def patch(self, endpoint, data):
        url = self.api_root + endpoint
        try:
            return requests.patch(url, json=data, auth=self.auth)
        except Exception as e:
            raise ValidationError(e)
