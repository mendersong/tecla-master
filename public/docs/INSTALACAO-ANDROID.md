# TECLADO MASTER — Instalação Android e documentação de entrega

## Projeto nativo

O diretório `android/` contém o projeto Android Studio em Kotlin com Jetpack Compose, MVVM, Room, Coroutines, AudioRecord e MidiManager. Requer Android 9.0 (API 28) ou superior. O app principal funciona offline; idioma padrão PT-BR e English opcional.

## Gerar o APK debug

1. Instale Android Studio, JDK 17, Android SDK 35 e build-tools 35.0.0.
2. Abra a pasta `android/`.
3. Se necessário, crie o wrapper com Gradle 8.9: `gradle wrapper --gradle-version 8.9`.
4. Rode `./gradlew :app:testDebugUnitTest :app:assembleDebug`.
5. O arquivo estará em `android/app/build/outputs/apk/debug/app-debug.apk`.
6. Instale via `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`, ou copie ao aparelho e autorize a instalação dessa origem.

## Gerar release assinado

Crie sua chave privada com `keytool -genkeypair -v -keystore release.keystore -alias teclado-master -keyalg RSA -keysize 2048 -validity 10000`.

No diretório `android/`, crie `keystore.properties` com `storeFile=release.keystore`, `storePassword`, `keyAlias` e `keyPassword`. Nunca envie esses valores ao repositório. Execute `./gradlew :app:assembleRelease` e valide com `apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk`.

O workflow `.github/workflows/android-apk.yml` automatiza testes, debug e release assinado. Configure os secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD`.

## Microfone e MIDI

Microfone: conceda RECORD_AUDIO, mantenha o ambiente em silêncio durante a calibração de 1,5 segundo e ajuste sensibilidade/gate. O algoritmo processa PCM real com FFT e saliência harmônica; não há notas pré-gravadas.

USB MIDI: use adaptador OTG compatível e conecte o controlador. O MidiManager detecta conexão/desconexão e recebe Note On/Off e velocity. No modo Auto, um dispositivo MIDI conectado tem prioridade sobre o microfone.

## Estrutura

- `data/MusicTheory.kt`: cifras, intervalos, inversões e comparação de classes de notas.
- `data/Curriculum.kt`: cinco níveis, 30 aulas, cinco avaliações e estudos originais.
- `data/ProgressStore.kt`: entidades Room e DAO transacional.
- `audio/AudioRecognizer.kt`: captura e análise espectral real.
- `midi/MidiRecognizer.kt`: USB MIDI nativo.
- `viewmodel/MasterViewModel.kt`: estado, prática, pontuação e prioridade de entrada.
- `ui/MasterApp.kt`: todas as telas Compose e o teclado interativo.

## Critérios de avaliação

Nota = 10 × (precisão × 0,40 + sequência × 0,25 + trocas × 0,20 + andamento × 0,15). Aprovação com 7,0. A nota nunca é aleatória. O desempenho, erros, tempo e tentativas são persistidos.

## Transparência sobre binários

O sandbox de preview web não contém o toolchain Android e, portanto, não anexa um APK não compilado ou uma assinatura fictícia. Os binários instaláveis são produzidos pelo Android Studio ou pelo CI documentado acima. Antes de distribuir, teste microfone e cada modelo de controlador MIDI nos aparelhos de destino.
