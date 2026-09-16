from django.contrib import admin
from django.http import HttpRequest, HttpResponse
from django.template.response import TemplateResponse
from django.urls import path

from apps.content.models import ContentItem, Language, Region


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "enabled")
    list_filter = ("enabled",)
    search_fields = ("code", "name")


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "native_name", "enabled")
    list_filter = ("enabled",)
    search_fields = ("code", "name", "native_name")


@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin):
    list_display = ("title", "region", "kind", "review_status", "media_preview")
    list_filter = ("region", "kind", "review_status")
    search_fields = ("title",)
    actions = ("mark_reviewed", "publish")

    @admin.display(description="Preview")
    def media_preview(self, obj: ContentItem) -> str:
        if obj.image:
            return f"Image: {obj.image.name}"
        if obj.audio:
            return f"Audio: {obj.audio.name}"
        return "—"

    @admin.action(description="Mark selected content as reviewed")
    def mark_reviewed(self, request: HttpRequest, queryset):  # type: ignore[no-untyped-def]
        queryset.update(review_status=ContentItem.ReviewStatus.REVIEWED, reviewed_by=request.user)

    @admin.action(description="Publish reviewed content")
    def publish(self, request: HttpRequest, queryset):  # type: ignore[no-untyped-def]
        invalid = queryset.exclude(review_status=ContentItem.ReviewStatus.REVIEWED)
        if invalid.exists():
            self.message_user(request, "Only reviewed content can be published.", level="ERROR")
            return
        queryset.update(review_status=ContentItem.ReviewStatus.PUBLISHED)

    def get_urls(self):  # type: ignore[no-untyped-def]
        return [
            path(
                "missing-translations/",
                self.admin_site.admin_view(self.missing_translations),
                name="contentitem_missing_translations",
            ),
            *super().get_urls(),
        ]

    def missing_translations(self, request: HttpRequest) -> HttpResponse:
        languages = Language.objects.filter(enabled=True)
        rows = [
            (language, ContentItem.objects.exclude(title_translations__has_key=language.code))
            for language in languages
        ]
        return TemplateResponse(
            request,
            "admin/content/missing_translations.html",
            {
                **self.admin_site.each_context(request),
                "rows": rows,
                "title": "Missing translations",
            },
        )
