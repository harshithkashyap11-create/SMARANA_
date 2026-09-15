# Phase 6 demo — Administration

1. Run `python manage.py seed_demo`, scan the printed TOTP setup URI, and open `/admin/`.
2. Confirm password-only login is rejected, then sign in with the current authenticator code.
3. Approve a pending professional and verify an audit row was added; deactivate them and verify login is rejected generically.
4. Add and end a doctor/caregiver assignment with a reason; confirm history remains and patient access is revoked immediately.
5. Check dashboard counts, disable a game, and confirm it disappears from the games API.
6. Force a user's logout and verify their refresh token no longer works. Trigger a patient PIN reset request and confirm the caregiver alert.
7. Browse and filter audit history. Run the export action and confirm the export itself creates an audit row.
