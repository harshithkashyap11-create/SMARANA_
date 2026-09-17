from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest, HttpResponse
from django.template.response import TemplateResponse
from django.urls import URLPattern, path

from apps.content.models import ContentItem, Language, Region


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin[Region]):
    list_display = ("code", "name", "enabled")
    list_filter = ("enabled",)
    search_fields = ("code", "name")


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin[Language]):
    list_display = ("code", "name", "native_name", "enabled")
    list_filter = ("enabled",)
    search_fields = ("code", "name", "native_name")


@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin[ContentItem]):
    list_display = ("title", "region", "kind", "review_status", "media_preview")
    list_filter = ("region", "kind", "review_status")
    search_fields = ("title",)
    actions = ("mark_reviewed", "publish")
    change_list_template = "admin/content/contentitem/change_list.html"

    @admin.display(description="Preview")
    def media_preview(self, obj: ContentItem) -> str:
        if obj.image:
            return f"Image: {obj.image.name}"
        if obj.audio:
            return f"Audio: {obj.audio.name}"
        return "—"

    @admin.action(description="Mark selected content as reviewed")
    def mark_reviewed(self, request: HttpRequest, queryset: QuerySet[ContentItem]) -> None:
        queryset.update(review_status=ContentItem.ReviewStatus.REVIEWED, reviewed_by=request.user)

    @admin.action(description="Publish reviewed content")
    def publish(self, request: HttpRequest, queryset: QuerySet[ContentItem]) -> None:
        invalid = queryset.exclude(review_status=ContentItem.ReviewStatus.REVIEWED)
        missing_reviewer = queryset.filter(reviewed_by__isnull=True)
        if invalid.exists() or missing_reviewer.exists():
            self.message_user(
                request, "Only reviewed content with a reviewer can be published.", level="ERROR"
            )
            return
        queryset.update(review_status=ContentItem.ReviewStatus.PUBLISHED)

    def get_urls(self) -> list[URLPattern]:
        return [
            path(
                "missing-translations/",
                self.admin_site.admin_view(self.missing_translations),
                name="contentitem_missing_translations",
            ),
            *super().get_urls(),
        ]

    def missing_translations(self, request: HttpRequest) -> HttpResponse:
        if not self.has_view_or_change_permission(request):
            from django.core.exceptions import PermissionDenied

            raise PermissionDenied
        request.current_app = self.admin_site.name
        languages = Language.objects.filter(enabled=True)
        items = list(ContentItem.objects.select_related("region"))
        rows = [
            (
                language,
                [
                    item
                    for item in items
                    if not isinstance(item.title_translations.get(language.code), str)
                    or not item.title_translations[language.code].strip()
                ],
            )
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
