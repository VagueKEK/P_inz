#!/bin/sh
# backend/entrypoint.sh

set -e

echo "Czekam na bazę danych..."

while ! nc -z db 5432; do
  sleep 0.1
done
echo "Baza danych dostępna!"

echo "Wykonywanie migracji..."
python manage.py migrate



echo "Uruchamianie serwera..."

exec python manage.py runserver 0.0.0.0:8000