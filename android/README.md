# TECLADO MASTER — Android nativo

Aplicativo Android 9+ (minSdk 28) em Kotlin, Jetpack Compose, MVVM, Room e Coroutines. O conteúdo essencial é local e funciona offline.

## O que é real

- `AudioRecognizer.kt`: AudioRecord PCM mono a 44,1 kHz, janela de 8192 amostras, Hann, FFT, saliência harmônica polifônica, oitava MIDI, gate e calibração do perfil espectral do ambiente.
- `MidiRecognizer.kt`: MidiManager, callbacks de conexão/desconexão, abertura das portas de saída do dispositivo e MidiReceiver para Note On, Note Off, velocity e All Notes Off. MIDI conectado tem prioridade sobre microfone no modo automático.
- `MasterViewModel.kt`: janela de estabilidade de 240 ms, erros após 520 ms, tentativas, ordem, trocas, tempo, nota ponderada 40/25/20/15 e desbloqueio com 7,0.
- `ProgressStore.kt`: Room para preferências, XP, tempo, exercícios e histórico de avaliações.
- Compose: capa, menu, cinco níveis, 30 aulas, avaliações, teclado, músicas originais, importação de cifras, progresso e ajustes PT-BR/English.

Nenhum áudio, evento MIDI ou nota de avaliação é gerado para simular performance.

## Build local

Requisitos: Android Studio com JDK 17, Android SDK 35 e build-tools 35.0.0.

1. Abra a pasta `android/` no Android Studio.
2. Se o wrapper ainda não existir, execute `gradle wrapper --gradle-version 8.9` com Gradle 8.9 instalado. No CI essa etapa é automática.
3. Execute `./gradlew :app:testDebugUnitTest :app:assembleDebug`.
4. APK debug: `app/build/outputs/apk/debug/app-debug.apk`.
5. Instale com `adb install -r app/build/outputs/apk/debug/app-debug.apk` ou copie o APK para o aparelho e permita instalação dessa origem.

## Release assinado

Crie uma chave própria (nunca a publique):

```sh
keytool -genkeypair -v -keystore release.keystore -alias teclado-master -keyalg RSA -keysize 2048 -validity 10000
```

Crie `android/keystore.properties`:

```properties
storeFile=release.keystore
storePassword=SUA_SENHA
keyAlias=teclado-master
keyPassword=SUA_SENHA_DA_CHAVE
```

Execute `./gradlew :app:assembleRelease` e verifique com `apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk`.

O workflow `.github/workflows/android-apk.yml` executa testes, gera o debug e produz uma release assinada quando os secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD` estão configurados.

## Uso

- Microfone: conceda a permissão, fique em silêncio durante 1,5 s de calibração e use fones se o som do teclado virtual estiver ativo. Ajuste sensibilidade e gate em Ajustes.
- MIDI: conecte o controlador por USB OTG antes ou depois de abrir o app. O modo Auto prioriza MIDI; Toque permanece disponível. Não exige permissão de microfone.
- A tônica é sempre dourada; as demais notas esperadas são verdes; detecção tem contorno azul; notas fora do acorde ficam vermelhas.

## Observação de entrega

Este repositório contém o projeto e o código-fonte nativo, não um binário APK fingido ou não verificado. O sandbox usado para o preview web não executa o SDK Android; os APKs devem ser gerados no Android Studio ou no workflow acima e testados em aparelho antes da distribuição.
