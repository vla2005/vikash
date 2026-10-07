import org.gradle.api.GradleException

// Execute com groovy.ui.GroovyMain usando os jars da distribuição do Gradle.
// Args: diretório app/android, diretório temporário para as chaves fictícias dos testes.
File androidDir = new File(args[0])
File temp = new File(args[1])
temp.mkdirs()
def binding = new Binding([ext: [:]])
new GroovyShell(binding).evaluate(new File(androidDir, 'app/release-signing-policy.gradle'))
def validate = binding.getVariable('ext').validateReleaseSigning
File debug = new File(androidDir, 'app/debug.keystore')
def credentials = { File file, String alias = 'release' ->
    [storeFile: file, storePassword: 'test-only-password', keyAlias: alias, keyPassword: 'test-only-password']
}
def rejects = { Map values ->
    try { validate(values, debug); assert false: 'A configuração insegura foi aceita' }
    catch (GradleException ex) { assert !ex.message.contains('test-only-password') }
}
def keytool = new File(System.getProperty('java.home'), 'bin/keytool.exe')
def run = { List command ->
    Process process = new ProcessBuilder(command.collect { it.toString() }).redirectErrorStream(true).start()
    def output = process.inputStream.text
    assert process.waitFor() == 0: 'Falha ao preparar chave fictícia: ' + output
}
rejects([storeFile: null, storePassword: null, keyAlias: null, keyPassword: null])
rejects(credentials(new File(temp, 'does-not-exist.jks')))
rejects([storeFile: debug, storePassword: 'android', keyAlias: 'androiddebugkey', keyPassword: 'android'])

File copiedDebug = new File(temp, 'copied-debug.jks')
copiedDebug.bytes = debug.bytes
run([keytool, '-changealias', '-keystore', copiedDebug, '-storepass', 'android',
     '-alias', 'androiddebugkey', '-destalias', 'release', '-keypass', 'android'])
rejects([storeFile: copiedDebug, storePassword: 'android', keyAlias: 'release', keyPassword: 'android'])
// Outro certificado/assunto não transforma uma chave privada divulgada em uma chave segura.
run([keytool, '-selfcert', '-keystore', copiedDebug, '-storepass', 'android', '-keypass', 'android',
     '-alias', 'release', '-dname', 'CN=Recertified Release', '-validity', '1'])
rejects([storeFile: copiedDebug, storePassword: 'android', keyAlias: 'release', keyPassword: 'android'])

File valid = new File(temp, 'test-release.jks')
if (valid.exists()) { assert valid.delete() }
run([keytool, '-genkeypair', '-keystore', valid, '-storepass', 'test-only-password',
     '-keypass', 'test-only-password', '-alias', 'release', '-dname', 'CN=Temporary Test Key',
     '-keyalg', 'RSA', '-validity', '1', '-storetype', 'JKS', '-noprompt'])
validate(credentials(valid), debug)
rejects(credentials(valid, 'missing-alias'))
rejects(credentials(valid) + [keyPassword: 'wrong-password'])
rejects(credentials(valid) + [storePassword: 'wrong-password'])

String build = new File(androidDir, 'app/build.gradle').text
assert build.contains("apply from: 'release-signing-policy.gradle'")
assert build.contains('signingConfig signingConfigs.release')
assert build.count('signingConfig signingConfigs.debug') == 1
assert build.contains('validateReleaseSigning(releaseCredentials')
assert build.contains("contains('release')")
// Executa o callback real de seleção de tarefas, sem precisar do Android SDK.
String gate = 'import org.gradle.api.GradleException\n' + build.substring(
        build.indexOf('gradle.taskGraph.whenReady'), build.indexOf('\ndependencies {'))
def runGate = { String taskName, Map values, Map options = [:], boolean cached = false ->
    def owner = new Expando(properties: options)
    def task = [project: owner, name: taskName]
    def taskGraph = new Expando()
    taskGraph.whenReady = { Closure callback -> callback([allTasks: [task]]) }
    def vars = new Binding([gradle: [taskGraph: taskGraph, startParameter: [configurationCacheRequested: cached]], project: owner,
            releaseCredentials: values, validateReleaseSigning: validate,
            file: { String name -> new File(androidDir, 'app/' + name) }])
    new GroovyShell(vars).evaluate(gate)
}
runGate('assembleDebug', [:])
for (String task : ['assembleRelease', 'bundleRelease', 'packageRelease', 'assemblePaidRelease']) {
    try { runGate(task, [storeFile: null]); assert false: 'Release sem chave foi aceito' }
    catch (GradleException ignored) {}
    runGate(task, credentials(valid))
}
try { runGate('assembleRelease', credentials(valid), ['android.injected.signing.store.file': debug.path]); assert false }
catch (GradleException ignored) {}
try { runGate('assembleRelease', credentials(valid), [:], true); assert false }
catch (GradleException ignored) {}
println 'PASS: invalid/debug/renamed-debug credentials rejected; private key accepted; real release task gate and debug control checked.'
