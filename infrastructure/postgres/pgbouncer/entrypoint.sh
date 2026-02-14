#!/bin/bash
set -e

# Wait for PostgreSQL master to be ready
echo "⏳ Waiting for PostgreSQL master to be ready..."
until pg_isready -h postgres-master -p 5432 -U postgres; do
  echo "Waiting for postgres-master..."
  sleep 2
done

echo "✅ PostgreSQL master is ready!"

# Wait for PostgreSQL replica to be ready
echo "⏳ Waiting for PostgreSQL replica to be ready..."
until pg_isready -h postgres-replica -p 5432 -U postgres; do
  echo "Waiting for postgres-replica..."
  sleep 2
done

echo "✅ PostgreSQL replica is ready!"

# Generate password hash if not already done
if grep -q "md5placeholder" /etc/pgbouncer/userlist.txt; then
    echo "🔐 Generating password hashes..."
    POSTGRES_PASS="${POSTGRES_PASSWORD:-postgres}"
    HASH=$(echo -n "${POSTGRES_PASS}postgres" | md5sum | awk '{print $1}')
    echo "\"postgres\" \"md5${HASH}\"" > /etc/pgbouncer/userlist.txt
    chmod 600 /etc/pgbouncer/userlist.txt
fi

echo "🚀 Starting PgBouncer..."
exec "$@"
