INSERT INTO users (username, email, password_hash)
VALUES (
    'admin',
    'admin@viernulvier.be',
    '$argon2id$v=19$m=19456,t=2,p=1$7KmTBS4/07NwyQCKkGadAA$B/0aAlJHX4JlHy8Cg/3ecBIiPNkTEAdzlT4XbinjlC8'
)
ON CONFLICT (email) DO NOTHING;
