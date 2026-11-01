/*
IMPORTANT:
    If using PostgreSQL:
        - update ALL columns defined with 'blob' to 'text', as PostgreSQL does not support the 'blob' data type.
        - update ALL columns defined with 'timestamp' to 'timestamptz', to ensure that time instants are stored accurately.
    If using MySQL:
        - add 'preserveInstants=true&connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true' to JDBC connection URL
          to ensure that time instants are stored accurately. See https://dev.mysql.com/doc/connector-j/en/connector-j-time-instants.html
*/
CREATE TABLE IF NOT EXISTS oauth2_authorization (
    id varchar(100) NOT NULL,
    registered_client_id varchar(100) NOT NULL,
    principal_name varchar(200) NOT NULL,
    authorization_grant_type varchar(100) NOT NULL,
    authorized_scopes varchar(1000) DEFAULT NULL,
    attributes text DEFAULT NULL,
    state varchar(500) DEFAULT NULL,
    authorization_code_value text DEFAULT NULL,
    authorization_code_issued_at timestamp with time zone DEFAULT NULL,
    authorization_code_expires_at timestamp with time zone DEFAULT NULL,
    authorization_code_metadata text DEFAULT NULL,
    access_token_value text DEFAULT NULL,
    access_token_issued_at timestamp with time zone DEFAULT NULL,
    access_token_expires_at timestamp with time zone DEFAULT NULL,
    access_token_metadata text DEFAULT NULL,
    access_token_type varchar(100) DEFAULT NULL,
    access_token_scopes varchar(1000) DEFAULT NULL,
    oidc_id_token_value text DEFAULT NULL,
    oidc_id_token_issued_at timestamp with time zone DEFAULT NULL,
    oidc_id_token_expires_at timestamp with time zone DEFAULT NULL,
    oidc_id_token_metadata text DEFAULT NULL,
    refresh_token_value text DEFAULT NULL,
    refresh_token_issued_at timestamp with time zone DEFAULT NULL,
    refresh_token_expires_at timestamp with time zone DEFAULT NULL,
    refresh_token_metadata text DEFAULT NULL,
    user_code_value text DEFAULT NULL,
    user_code_issued_at timestamp with time zone DEFAULT NULL,
    user_code_expires_at timestamp with time zone DEFAULT NULL,
    user_code_metadata text DEFAULT NULL,
    device_code_value text DEFAULT NULL,
    device_code_issued_at timestamp with time zone DEFAULT NULL,
    device_code_expires_at timestamp with time zone DEFAULT NULL,
    device_code_metadata text DEFAULT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS oauth2_authorization_access_idx ON oauth2_authorization(access_token_value);
CREATE INDEX IF NOT EXISTS oauth2_authorization_refresh_idx ON oauth2_authorization(refresh_token_value);
CREATE INDEX IF NOT EXISTS oauth2_authorization_code_idx ON oauth2_authorization(authorization_code_value);
CREATE INDEX IF NOT EXISTS oauth2_authorization_state_idx ON oauth2_authorization(state);
