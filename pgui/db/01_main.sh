#!/bin/bash
set -e

password=$(printf "$ADMIN_PASS" | shasum -a 1 | awk '{ print $1 }')

echo "Creating schema"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE SCHEMA _pgui;

    CREATE TABLE _pgui.user_auth (
        id serial PRIMARY KEY,
        username text NOT NULL,
        password text NOT NULL
    );

    CREATE TABLE _pgui.login (
        id serial PRIMARY KEY,
        username text NOT NULL,
        time timestamp NOT NULL DEFAULT now()
    );

    INSERT INTO _pgui.user_auth (username, password)
    VALUES ('$ADMIN_USER', '$password');


    -- I'll make the flag location simple for y'all

    CREATE TABLE flag (flag text);
    INSERT INTO flag VALUES ('$FLAG');
EOSQL
