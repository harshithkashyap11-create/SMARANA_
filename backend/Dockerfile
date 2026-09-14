FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system smarana \
    && adduser --system --ingroup smarana --home /home/smarana smarana

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=smarana:smarana . .

USER smarana

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
