# Phase 6 demo — Administration

1. Start the seeded local demo or run `python manage.py seed_demo` in development, then open `/portal/admin` (or `/admin/` directly).
2. Sign in with username `admin` and password `SmaranaDemo123!`. Confirm that no OTP field or device-management option appears. The password and profile controls remain available; other staff roles cannot enter this portal.
3. Approve a pending professional and verify an audit row was added; deactivate them and verify login is rejected generically.
4. Add and end a doctor/caregiver assignment with a reason; confirm history remains and patient access is revoked immediately. For a doctor transfer, select patients, choose **Transfer to the selected doctor**, select the approved doctor and press **Go**.
5. Check dashboard counts, disable a game, and confirm it disappears from the games API.
6. Force a user's logout and verify their refresh token no longer works. Trigger a patient PIN reset request and confirm the caregiver alert.
7. Browse and filter audit history. Run the export action and confirm the export itself creates an audit row.
