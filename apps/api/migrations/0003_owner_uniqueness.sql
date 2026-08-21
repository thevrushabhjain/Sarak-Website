-- A partial unique index enforces single-bootstrap under concurrent requests:
-- the losing INSERT fails with a UNIQUE violation instead of creating a second owner.
CREATE UNIQUE INDEX idx_users_single_owner ON users(role) WHERE role='owner';
