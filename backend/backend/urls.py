# backend/urls.py
from django.contrib import admin
from django.urls import path
from django.http import HttpResponse

def health(_):
    return HttpResponse(
        "<h3>Backend OK</h3>"
        "<p>API: <code>/api/...</code></p>"
        "<p>Frontend: <a href='http://localhost:5173' target='_blank'>http://localhost:5173</a></p>"
        "<p><a href='http://127.0.0.1:8000/admin'> -- panel admina django<p/>",
        content_type="text/html"
    )

def api_root(_):
    return HttpResponse("API działa ✅ (tu wpadną Twoje endpointy)", content_type="text/plain")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", health),       # /  -> strona zdrowia zamiast 404
    path("api/", api_root), # /api -> na razie prosty health
]
