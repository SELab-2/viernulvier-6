INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@viernulvier.be',
    '$argon2id$v=19$m=65536,t=3,p=4$VFlmbzjBIksoOm9Lh1ROWA$ouN1Ea07s+flVMY3wBoZMlYRV7++ojpZ2VTQ0AM/6Wk',
    'admin'
);
