BEGIN;

-- IDs são gerados pelo banco. Não altera as instituições já cadastradas.
INSERT INTO financial_institutions (name, logo_url)
SELECT institution.name, institution.logo_url
FROM (VALUES
    ('BRB', '/images/financial-institutions/brb.webp'),
    ('Banrisul', '/images/financial-institutions/banrisul.webp'),
    ('BMG', '/images/financial-institutions/bmg.webp'),
    ('Digio', '/images/financial-institutions/digio.webp'),
    ('Sofisa Direto', '/images/financial-institutions/sofisa-direto.webp'),
    ('XP', '/images/financial-institutions/xp.webp'),
    ('RecargaPay', '/images/financial-institutions/recargapay.webp'),
    ('Daycoval', '/images/financial-institutions/daycoval.webp'),
    ('Banestes', '/images/financial-institutions/banestes.webp'),
    ('Banco do Nordeste', '/images/financial-institutions/banco-do-nordeste.webp'),
    ('Banco da Amazônia', '/images/financial-institutions/banco-da-amazonia.webp'),
    ('Banpará', '/images/financial-institutions/banpara.webp'),
    ('Unicred', '/images/financial-institutions/unicred.webp'),
    -- Sem logo: o app exibe seu ícone genérico de instituição.
    ('Outra instituição', '')
) AS institution(name, logo_url)
WHERE NOT EXISTS (
    SELECT 1 FROM financial_institutions existing
    WHERE LOWER(existing.name) = LOWER(institution.name)
);

COMMIT;
