"""Read-only live probes using fictional local accounts. Never prints tokens."""
import json
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.local' / 'deep-audit'
OUT.mkdir(exist_ok=True)
BASE = 'http://127.0.0.1:8000'
results = []

def call(path, token=None, data=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + path, headers=headers, data=json.dumps(data).encode() if data is not None else None, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return response.status, response.read(), dict(response.headers)
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(), dict(exc.headers)

tokens = {}
for role, email in [('caregiver', 'priya@example.com'), ('doctor', 'deka@example.com'), ('foreign_caregiver', 'caregiver2@example.com'), ('foreign_doctor', 'doctor2@example.com'), ('admin', 'admin')]:
    status, body, _ = call('/api/v1/auth/login/', data={'email_or_phone': email, 'password': 'SmaranaDemo123!', 'device_id': 'deep-audit-api-' + role})
    results.append({'probe': 'login ' + role, 'status': status})
    if status == 200: tokens[role] = json.loads(body)['access']
status, body, _ = call('/api/v1/auth/patient/login/', data={'login_id': 'RAO1234', 'pin': '1234', 'device_id': 'deep-audit-api-patient'})
results.append({'probe': 'login patient', 'status': status})
if status == 200: tokens['patient'] = json.loads(body)['access']
status, body, _ = call('/api/v1/patients/', tokens['caregiver'])
patients = json.loads(body)['results']
pid = next(x['id'] for x in patients if x['name'] == 'Rao')
for role, token in [('anonymous', None), *tokens.items()]:
    for suffix in ['', 'memories/', 'family/', 'routine-items/', 'medications/', 'notes/', 'baseline/', 'metrics/', 'difficulty/', 'assignments/', 'checkins/', 'game-sessions/', 'report/', 'emergency-card/']:
        path = f'/api/v1/patients/{pid}/' + suffix
        status, body, headers = call(path, token)
        row = {'role': role, 'path': path, 'status': status, 'cache_control': headers.get('Cache-Control'), 'bytes': len(body)}
        if status == 200 and headers.get('Content-Type') == 'application/pdf':
            name = f'{role}-{suffix.rstrip("/")}.pdf'
            (OUT / name).write_bytes(body)
            row['file'] = name
        results.append(row)
    status, body, _ = call(f'/api/v1/alerts/?patient={pid}', token)
    results.append({'role': role, 'path': '/api/v1/alerts/', 'status': status, 'count': len(json.loads(body)) if status == 200 else None})
status, body, _ = call('/api/v1/alerts/?patient=not-a-uuid', tokens['caregiver'])
results.append({'probe': 'malformed alert patient ID', 'status': status})
for query in ['from=2026-02-30', 'from=bad', 'from=2026-09-20&to=2026-09-01', 'from=0001-01-01&to=0001-01-01', 'from=9999-12-31&to=9999-12-31']:
    status, body, _ = call(f'/api/v1/patients/{pid}/report/?{query}', tokens['caregiver'])
    results.append({'probe': 'report date boundary', 'query': query, 'status': status, 'bytes': len(body)})
status, body, _ = call(f'/api/v1/patients/{pid}/memory-quiz/next/', tokens.get('patient'))
results.append({'probe': 'quiz question', 'status': status, 'body': json.loads(body) if status == 200 else body.decode()[:200]})
if status == 200 and (json.loads(body).get('media_url') or '').startswith('/media/'):
    status, body, _ = call(json.loads(body)['media_url'], tokens.get('patient'))
    results.append({'probe': 'quiz media authenticated', 'status': status, 'bytes': len(body)})
for path in ['/api/v1/voice/readiness/', '/api/v1/doctor/dashboard/', '/api/v1/sync/pull/']:
    status, body, _ = call(path, tokens.get('patient'))
    results.append({'probe': path, 'status': status, 'body': json.loads(body) if 'readiness' in path and status == 200 else None})
(OUT / 'api-results.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'patient_id': pid, 'probe_count': len(results), 'server_errors': [r for r in results if r['status'] >= 500], 'output': str(OUT)}, indent=2))
