FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 fonts-dejavu-core fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system smarana \
    && adduser --system --ingroup smarana --home /home/smarana smarana

WORKDIR /app

ARG INSTALL_DDA=false
COPY requirements.txt requirements-dda.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt
RUN if [ "$INSTALL_DDA" = "true" ]; then pip install --no-cache-dir -r requirements-dda.txt; fi

COPY --chown=smarana:smarana . .

RUN mkdir -p /app/staticfiles && chown smarana:smarana /app/staticfiles

USER smarana

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
