# Assinatura de release

A chave de `app/debug.keystore` é pública e serve somente para desenvolvimento.
Builds de release exigem uma chave privada própria, armazenada fora do repositório.

Defina estas variáveis no ambiente da build:

- `VIKASH_RELEASE_STORE_FILE`: caminho do arquivo de chave, preferencialmente absoluto.
- `VIKASH_RELEASE_STORE_PASSWORD`: senha do arquivo.
- `VIKASH_RELEASE_KEY_ALIAS`: alias da chave privada.
- `VIKASH_RELEASE_KEY_PASSWORD`: senha da chave privada.

No GitHub Actions, mantenha o arquivo e as senhas em Secrets. Restaure o arquivo
em uma pasta temporária do runner, defina as variáveis e execute `assembleRelease`
ou `bundleRelease`, usando `--no-configuration-cache`. Não imprima as variáveis nem
envie o arquivo para o Git. A configuração de release não aceita opções
`android.injected.signing.*` (incluindo as usadas pelo assistente de assinatura do
Android Studio); use as variáveis acima e a tarefa Gradle. O cache de configuração
é recusado para release para que a chave seja validada em toda execução.

Uma tarefa de release falha se faltarem credenciais, se a chave não abrir ou se
for a chave/certificado de debug, inclusive uma cópia renomeada. O debug continua
funcionando sem essas variáveis. Chaves privadas, propriedades locais de assinatura,
APKs e AABs são ignorados pelo Git. O script de configuração e seus testes são versionados.

Guarde uma cópia segura da chave de release: futuras atualizações devem usar a
mesma assinatura. Se já distribuiu um APK assinado com debug, mudar de chave exige
reinstalar o app nesses aparelhos; preserve/exporte os dados necessários antes disso.

## APK Android ARM64

Execute `npm run build:android:apks` na pasta `app` para recriar o Android,
compilar com R8 e gerar somente o APK ARM64. O comando usa as mesmas
credenciais `VIKASH_RELEASE_*` e valida a assinatura privada antes da build.
Os APKs e o mapping ficam em `app/build/android-apks/`, fora do Git.

A fonte da política de assinatura para `expo prebuild` fica em
`app/plugins/release-signing-policy.gradle`; a cópia em `android/app/` é gerada
pelo plugin. Ao mudar a política, atualize a fonte e regenere o projeto.
