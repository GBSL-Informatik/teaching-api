CREATE USER teaching_website_backend WITH PASSWORD 'zW4SMEXLHpXXxxk';
CREATE DATABASE teaching_website;
\c teaching_website
GRANT ALL PRIVILEGES ON SCHEMA public TO teaching_website_backend;

