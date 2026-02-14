FROM alpine:3.19

# Install PgBouncer and dependencies
RUN apk add --no-cache \
    pgbouncer \
    postgresql-client \
    bash \
    curl \
    && mkdir -p /var/log/pgbouncer \
    && mkdir -p /etc/pgbouncer \
    && chown -R postgres:postgres /var/log/pgbouncer

# Copy configuration files
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY userlist.txt /etc/pgbouncer/userlist.txt
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Set permissions
RUN chmod 644 /etc/pgbouncer/pgbouncer.ini && \
    chmod 600 /etc/pgbouncer/userlist.txt && \
    chmod +x /usr/local/bin/entrypoint.sh && \
    chown -R postgres:postgres /etc/pgbouncer

USER postgres

EXPOSE 6432

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD psql -h localhost -p 6432 -U postgres -d pgbouncer -c "SHOW POOLS;" || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["pgbouncer", "/etc/pgbouncer/pgbouncer.ini"]
