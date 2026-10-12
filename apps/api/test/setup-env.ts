// Integration tests run against a dedicated database (created by docker/init-test-db.sql)
// so they can freely truncate tables without touching development data.
process.env.DATABASE_URL ??= 'postgres://tickets:tickets@localhost:5434/tickets_test';
